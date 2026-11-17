import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GraphStore } from '../../state/graph-store';
import { formatarDuracao } from '../../state/graph-step';
import type { GraphNode, GraphStep } from '../../state/graph-step';

const ROTULO: Record<GraphNode, string> = {
  retrieve: 'Retrieve',
  grade: 'Grade',
  webSearch: 'Search',
  answer: 'Answer',
};

const DESCRICAO: Record<GraphNode, string> = {
  retrieve: 'Busca vetorial na base de demonstrações financeiras (CVM)',
  grade: 'Avalia a relevância do contexto recuperado',
  webSearch: 'Busca web complementar, usada quando o contexto local é insuficiente',
  answer: 'Gera a resposta e associa cada trecho à sua fonte',
};

interface StepView {
  readonly id: string;
  readonly node: GraphNode;
  readonly label: string;
  readonly description: string;
  readonly running: boolean;
  readonly detail?: string;
  readonly duration?: string;
}

@Component({
  selector: 'app-graph-panel',
  templateUrl: './graph-panel.html',
  styleUrl: './graph-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphPanelComponent {
  private readonly store = inject(GraphStore);

  protected readonly fallbackActive = this.store.fallbackActive;

  protected readonly views = computed<StepView[]>(() =>
    this.store.steps().map((step) => this.paraView(step)),
  );

  private paraView(step: GraphStep): StepView {
    const rotuloBase = ROTULO[step.node];
    const label =
      step.iteration && step.iteration > 1
        ? `${rotuloBase} · iteração ${step.iteration}`
        : rotuloBase;
    const duration =
      step.status === 'done' && step.finishedAt
        ? formatarDuracao(step.finishedAt - step.startedAt)
        : undefined;

    return {
      id: step.id,
      node: step.node,
      label,
      description: DESCRICAO[step.node],
      running: step.status === 'running',
      detail: step.detail,
      duration,
    };
  }
}
