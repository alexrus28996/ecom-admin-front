import { AdminCategory } from '../../services/category.service';

export interface CategoryParentOption {
  id: string | null;
  label: string;
  disabled?: boolean;
}

export interface CategoryFormDialogData {
  mode: 'create' | 'edit';
  category?: AdminCategory;
  parents: CategoryParentOption[];
}
