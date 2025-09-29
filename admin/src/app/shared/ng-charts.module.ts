import { Directive, Input, NgModule } from '@angular/core';

export type ChartType = string;

export interface ChartDataset<TType extends ChartType = ChartType> {
  label?: string;
  data: Array<number | null>;
  borderColor?: string;
  backgroundColor?: string;
  yAxisID?: string;
}

export interface ChartData<TType extends ChartType = ChartType> {
  labels: Array<string | number | Date>;
  datasets: ChartDataset<TType>[];
}

export interface ChartOptions<TType extends ChartType = ChartType> {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: Record<string, unknown>;
  scales?: Record<string, unknown>;
}

@Directive({
  selector: 'canvas[baseChart]'
})
export class BaseChartDirective<TType extends ChartType = ChartType> {
  @Input() data?: ChartData<TType>;
  @Input() options?: ChartOptions<TType>;
  @Input('chartType') chartType?: TType;
}

@NgModule({
  declarations: [BaseChartDirective],
  exports: [BaseChartDirective]
})
export class NgChartsModule {}
