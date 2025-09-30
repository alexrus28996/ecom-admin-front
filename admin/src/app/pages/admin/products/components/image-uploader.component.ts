import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { UploadService, UploadResult } from '../../../../services/upload.service';
import { ToastService } from '../../../../core/toast.service';
import { ProductImage } from '../models/product';

@Component({
  selector: 'app-product-image-uploader',
  templateUrl: './image-uploader.component.html',
  styleUrls: ['./image-uploader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageUploaderComponent {
  @Input() images: ProductImage[] = [];
  @Input() editable = true;
  @Output() readonly imagesChange = new EventEmitter<ProductImage[]>();

  uploading = false;

  constructor(private readonly uploadService: UploadService, private readonly toast: ToastService) {}

  onFileSelected(event: Event): void {
    if (!this.editable) {
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const [file] = Array.from(input.files);
    this.uploading = true;
    this.uploadService.upload(file).subscribe({
      next: (result: UploadResult) => {
        this.uploading = false;
        const newImage: ProductImage = { url: result.url, alt: file.name };
        this.images = [...(this.images || []), newImage];
        this.imagesChange.emit(this.images);
      },
      error: () => {
        this.uploading = false;
        this.toast.error('Image upload failed');
      }
    });
  }

  updateAlt(index: number, alt: string): void {
    const next = [...this.images];
    if (!next[index]) {
      return;
    }
    next[index] = { ...next[index], alt };
    this.images = next;
    this.imagesChange.emit(this.images);
  }

  remove(index: number): void {
    if (!this.editable) {
      return;
    }
    const next = [...this.images];
    next.splice(index, 1);
    this.images = next;
    this.imagesChange.emit(this.images);
  }

  onDrop(event: CdkDragDrop<ProductImage[]>): void {
    if (!this.editable) {
      return;
    }
    const next = [...this.images];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.images = next;
    this.imagesChange.emit(this.images);
  }
}
