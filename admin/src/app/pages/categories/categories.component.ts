import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NestedTreeControl } from '@angular/cdk/tree';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PermissionsService } from '../../core/permissions.service';
import { environment } from '../../../environments/environment';
import { AdminCategory, CategoryService } from '../../services/category.service';
import { CategoryFormDialogComponent } from './category-form-dialog.component';
import { CategoryFormDialogData, CategoryParentOption } from './category.models';

interface CategoryNode {
  id: string;
  name: string;
  slug?: string;
  parentId: string | null;
  sortOrder?: number;
  status: 'active' | 'inactive' | 'deleted';
  description?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[];
  isActive?: boolean;
  deletedAt?: string | null;
  children: CategoryNode[];
  original: AdminCategory;
}

interface CategoryViewNode {
  id: string;
  reference: CategoryNode;
  children: CategoryViewNode[];
}

interface PermissionSnapshot {
  create: boolean;
  edit: boolean;
  delete: boolean;
}

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesComponent implements OnInit, OnDestroy {
  readonly searchControl = new FormControl('');
  readonly treeControl = new NestedTreeControl<CategoryViewNode>((node) => node.children);
  readonly dataSource = new MatTreeNestedDataSource<CategoryViewNode>();
  readonly selection = new SelectionModel<string>(true);

  @ViewChild('reassignParentDialog', { static: true })
  reassignParentDialog?: TemplateRef<unknown>;

  readonly parentSelectionControl = new FormControl<string | null>(null);

  loading = false;
  errorMessage: string | null = null;
  lastError: unknown = null;

  breadcrumbTrail: string[] = [];
  activeNodeId: string | null = null;

  bulkParentOptions: CategoryParentOption[] = [];

  permissionSnapshot: PermissionSnapshot = { create: false, edit: false, delete: false };
  private readonly destroy$ = new Subject<void>();
  private treeData: CategoryNode[] = [];
  private viewData: CategoryViewNode[] = [];
  private nodeLookup = new Map<string, CategoryNode>();
  private viewLookup = new Map<string, CategoryViewNode>();
  currentViewIds = new Set<string>();
  private bulkDialogRef?: MatDialogRef<unknown>;

  constructor(
    private readonly categories: CategoryService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.observePermissions();
    this.observeSearch();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasChild = (_: number, node: CategoryViewNode) => node.children.length > 0;

  toggleNodeSelection(node: CategoryViewNode): void {
    this.selection.toggle(node.id);
    this.cdr.markForCheck();
  }

  isNodeSelected(node: CategoryViewNode): boolean {
    return this.selection.isSelected(node.id);
  }

  isAllSelected(): boolean {
    return this.selection.selected.length > 0 && this.selection.selected.length === this.currentViewIds.size;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      this.cdr.markForCheck();
      return;
    }
    this.selection.clear();
    this.currentViewIds.forEach((id) => this.selection.select(id));
    this.cdr.markForCheck();
  }

  hasDeletedSelection(): boolean {
    return this.selection.selected.some((id) => {
      const node = this.nodeLookup.get(id);
      return !!node && node.status === 'deleted';
    });
  }

  openCreate(): void {
    if (!this.permissionSnapshot.create) {
      return;
    }
    const data: CategoryFormDialogData = {
      mode: 'create',
      parents: this.buildParentOptions()
    };
    this.dialog
      .open(CategoryFormDialogComponent, {
        width: '720px',
        data
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.refresh) {
          this.loadCategories();
        }
      });
  }

  openEdit(node: CategoryViewNode): void {
    if (!this.permissionSnapshot.edit) {
      return;
    }
    const excluded = this.collectDescendantIds(node.reference);
    excluded.add(node.id);
    const data: CategoryFormDialogData = {
      mode: 'edit',
      category: node.reference.original,
      parents: this.buildParentOptions(excluded)
    };
    this.dialog
      .open(CategoryFormDialogComponent, {
        width: '720px',
        data
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.refresh) {
          this.loadCategories();
        }
      });
  }

  confirmDelete(node: CategoryViewNode): void {
    if (!this.permissionSnapshot.delete) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          titleKey: 'Delete category',
          messageKey: undefined,
          messageParams: undefined,
          confirmKey: 'Delete'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.delete(node.reference.id);
        }
      });
  }

  confirmRestore(node: CategoryViewNode): void {
    if (!this.permissionSnapshot.edit) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          titleKey: 'Restore category',
          messageKey: undefined,
          messageParams: undefined,
          confirmKey: 'Restore'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.restore(node.reference.id);
        }
      });
  }

  selectNode(node: CategoryViewNode): void {
    this.activeNodeId = node.id;
    this.breadcrumbTrail = this.buildBreadcrumb(node.reference);
    this.expandPath(node.id);
    this.cdr.markForCheck();
  }

  confirmBulkDelete(): void {
    if (!this.permissionSnapshot.delete || !this.selection.selected.length) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          titleKey: 'Delete selected categories',
          messageKey: undefined,
          messageParams: undefined,
          confirmKey: 'Delete'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.bulkDelete();
        }
      });
  }

  confirmBulkRestore(): void {
    if (!this.permissionSnapshot.edit || !this.selection.selected.length) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          titleKey: 'Restore selected categories',
          confirmKey: 'Restore'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.bulkRestore();
        }
      });
  }

  openBulkReassign(): void {
    if (!this.selection.selected.length) {
      return;
    }
    const excluded = new Set<string>();
    this.selection.selected.forEach((id) => {
      excluded.add(id);
      const node = this.nodeLookup.get(id);
      if (node) {
        this.collectDescendantIds(node).forEach((descendant) => excluded.add(descendant));
      }
    });
    this.bulkParentOptions = this.buildParentOptions(excluded);
    this.parentSelectionControl.reset();
    this.cdr.markForCheck();
    if (this.reassignParentDialog) {
      this.bulkDialogRef = this.dialog.open(this.reassignParentDialog, {
        width: '420px'
      });
      this.bulkDialogRef.afterClosed().subscribe(() => {
        this.parentSelectionControl.reset();
      });
    }
  }

  applyBulkReassign(): void {
    if (!this.bulkDialogRef) {
      return;
    }
    const parentId = this.parentSelectionControl.value || null;
    const ids = [...this.selection.selected];
    this.bulkDialogRef.disableClose = true;
    this.categories.bulkReassignParent(ids, parentId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success('Categories reassigned');
        this.bulkDialogRef?.close();
        this.loadCategories();
      },
      error: (error) => {
        this.handleError('Unable to reassign categories', error);
        this.bulkDialogRef?.close();
      }
    });
  }

  cancelBulkReassign(): void {
    this.bulkDialogRef?.close();
  }

  onDrop(event: CdkDragDrop<CategoryViewNode[]>, parent?: CategoryViewNode | null): void {
    if (!this.permissionSnapshot.edit) {
      return;
    }
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const container = event.container.data;
    moveItemInArray(container, event.previousIndex, event.currentIndex);
    const parentNode = parent ? parent.reference : null;
    const targetArray = parentNode ? parentNode.children : this.treeData;
    const orderIds = container.map((item) => item.id);
    const normalizedChildren = orderIds
      .map((id) => targetArray.find((child) => child.id === id) || this.nodeLookup.get(id))
      .filter((child): child is CategoryNode => !!child);

    if (parentNode) {
      parentNode.children = normalizedChildren;
    } else {
      this.treeData = normalizedChildren;
    }

    this.rebuildView();
    if (!environment.production) {
      console.log(`Reorder applied: parent=${parentNode?.id ?? 'root'}, order=${orderIds.join(',')}`);
    }

    this.categories
      .reorderChildren(parentNode?.id ?? null, orderIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Sort order updated');
          this.loadCategories();
        },
        error: (error) => {
          this.handleError('Unable to reorder categories', error);
          this.loadCategories();
        }
      });
  }

  trackById(_: number, node: CategoryViewNode): string {
    return node.id;
  }

  nodeStatusClass(node: CategoryNode): string {
    switch (node.status) {
      case 'deleted':
        return 'status-deleted';
      case 'inactive':
        return 'status-inactive';
      default:
        return 'status-active';
    }
  }

  parentLabel(node: CategoryNode): string {
    if (!node.parentId) {
      return 'Root';
    }
    return this.nodeLookup.get(node.parentId)?.name ?? 'Root';
  }

  private observePermissions(): void {
    combineLatest({
      create: this.permissions.can$('category:create'),
      edit: this.permissions.can$('category:edit'),
      delete: this.permissions.can$('category:delete')
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe((snapshot) => {
        this.permissionSnapshot = snapshot;
        this.cdr.markForCheck();
      });
  }

  private observeSearch(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.rebuildView());
  }

  private loadCategories(): void {
    this.loading = true;
    this.errorMessage = null;
    this.lastError = null;
    this.selection.clear();
    this.cdr.markForCheck();

    this.categories
      .list({ limit: 1000, includeDeleted: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const items = response.items ?? response.data ?? [];
          this.treeData = this.buildTree(items);
          this.rebuildView();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.handleError('Unable to load categories', error);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private buildTree(items: AdminCategory[]): CategoryNode[] {
    this.nodeLookup = new Map<string, CategoryNode>();

    const nodes = items.map((item) => this.createNode(item));
    const map = new Map<string, CategoryNode>();
    nodes.forEach((node) => map.set(node.id, node));

    const roots: CategoryNode[] = [];
    nodes.forEach((node) => {
      const parent = node.parentId ? map.get(node.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortRecursively = (list: CategoryNode[]): void => {
      list.sort((a, b) => {
        const orderA = a.sortOrder ?? 0;
        const orderB = b.sortOrder ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
      list.forEach((child) => sortRecursively(child.children));
    };

    sortRecursively(roots);
    this.nodeLookup = map;
    return roots;
  }

  private createNode(item: AdminCategory): CategoryNode {
    const id = item.id ?? item._id;
    const parentId = typeof item.parent === 'string' ? item.parent : item.parent?._id ?? null;
    const status: 'active' | 'inactive' | 'deleted' = item.deletedAt
      ? 'deleted'
      : item.isActive === false
        ? 'inactive'
        : 'active';

    const node: CategoryNode = {
      id,
      name: item.name,
      slug: item.slug,
      parentId,
      sortOrder: (item as any).sortOrder ?? (item as any).displayOrder ?? undefined,
      status,
      description: item.description ?? null,
      imageUrl: (item as any).imageUrl ?? (item as any).image ?? null,
      bannerUrl: (item as any).bannerUrl ?? null,
      iconUrl: (item as any).iconUrl ?? null,
      metaTitle: item.metaTitle ?? null,
      metaDescription: item.metaDescription ?? null,
      metaKeywords: Array.isArray(item.metaKeywords) ? item.metaKeywords : [],
      isActive: item.isActive ?? true,
      deletedAt: item.deletedAt ?? null,
      children: [],
      original: item
    };

    this.nodeLookup.set(id, node);
    return node;
  }

  private rebuildView(): void {
    const term = (this.searchControl.value || '').toString().trim().toLowerCase();
    this.viewData = this.buildViewNodes(this.treeData, term);
    this.dataSource.data = this.viewData;
    this.indexViewNodes();
    const flattened = this.flattenView(this.viewData);
    this.currentViewIds = new Set(flattened.map((node) => node.id));
    this.treeControl.dataNodes = flattened;

    if (term) {
      flattened.forEach((node) => {
        if (this.matches(node.reference, term)) {
          this.expandPath(node.id);
        }
      });
    } else {
      this.treeControl.collapseAll();
    }

    this.cdr.markForCheck();
  }

  private buildViewNodes(nodes: CategoryNode[], term: string): CategoryViewNode[] {
    return nodes
      .map((node) => this.buildViewNode(node, term))
      .filter((value): value is CategoryViewNode => !!value);
  }

  private buildViewNode(node: CategoryNode, term: string): CategoryViewNode | null {
    const children = this.buildViewNodes(node.children, term);
    const matches = !term || this.matches(node, term);
    if (!matches && !children.length) {
      return null;
    }
    return {
      id: node.id,
      reference: node,
      children
    };
  }

  private matches(node: CategoryNode, term: string): boolean {
    if (!term) {
      return true;
    }
    const haystacks = [node.name, node.slug ?? '', node.metaDescription ?? '', node.metaTitle ?? ''];
    return haystacks.some((value) => value?.toLowerCase().includes(term));
  }

  private flattenView(nodes: CategoryViewNode[]): CategoryViewNode[] {
    const result: CategoryViewNode[] = [];
    const stack = [...nodes];
    while (stack.length) {
      const node = stack.shift();
      if (!node) {
        continue;
      }
      result.push(node);
      stack.unshift(...node.children);
    }
    return result;
  }

  private indexViewNodes(): void {
    this.viewLookup = new Map();
    const traverse = (nodes: CategoryViewNode[]): void => {
      nodes.forEach((node) => {
        this.viewLookup.set(node.id, node);
        traverse(node.children);
      });
    };
    traverse(this.viewData);
  }

  private expandPath(nodeId: string): void {
    const chain = this.buildAncestorChain(nodeId);
    chain.forEach((id) => {
      const viewNode = this.viewLookup.get(id);
      if (viewNode) {
        this.treeControl.expand(viewNode);
      }
    });
  }

  private buildAncestorChain(nodeId: string): string[] {
    const chain: string[] = [];
    let currentId: string | null = nodeId;
    while (currentId) {
      chain.unshift(currentId);
      const node = this.nodeLookup.get(currentId);
      currentId = node?.parentId ?? null;
    }
    return chain;
  }

  private buildBreadcrumb(node: CategoryNode): string[] {
    const labels: string[] = [node.name];
    let currentParentId = node.parentId;
    while (currentParentId) {
      const parent = this.nodeLookup.get(currentParentId);
      if (!parent) {
        break;
      }
      labels.unshift(parent.name);
      currentParentId = parent.parentId;
    }
    return labels;
  }

  private delete(id: string): void {
    this.categories
      .delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Category deleted');
          this.loadCategories();
        },
        error: (error) => this.handleError('Unable to delete category', error)
      });
  }

  private restore(id: string): void {
    this.categories
      .restore(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Category restored');
          this.loadCategories();
        },
        error: (error) => this.handleError('Unable to restore category', error)
      });
  }

  private bulkDelete(): void {
    const ids = [...this.selection.selected];
    this.categories
      .bulkDelete(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Categories deleted');
          this.selection.clear();
          this.loadCategories();
        },
        error: (error) => this.handleError('Unable to delete categories', error)
      });
  }

  private bulkRestore(): void {
    const ids = [...this.selection.selected];
    this.categories
      .bulkRestore(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Categories restored');
          this.selection.clear();
          this.loadCategories();
        },
        error: (error) => this.handleError('Unable to restore categories', error)
      });
  }

  private collectDescendantIds(node: CategoryNode): Set<string> {
    const ids = new Set<string>();
    const stack: CategoryNode[] = [...node.children];
    while (stack.length) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      ids.add(current.id);
      stack.push(...current.children);
    }
    return ids;
  }

  private buildParentOptions(excluded: Set<string> = new Set()): CategoryParentOption[] {
    const options: CategoryParentOption[] = [
      { id: null, label: 'No parent (root)', disabled: false }
    ];
    const visit = (nodes: CategoryNode[], depth: number): void => {
      nodes.forEach((node) => {
        const prefix = depth ? `${'— '.repeat(depth)}${node.name}` : node.name;
        options.push({ id: node.id, label: prefix, disabled: excluded.has(node.id) });
        visit(node.children, depth + 1);
      });
    };
    visit(this.treeData, 0);
    return options;
  }

  private handleError(message: string, error: any): void {
    this.errorMessage = message;
    this.lastError = error;
    this.toast.error(message);
    this.cdr.markForCheck();
  }
}
