<script setup lang="ts">
import { computed } from 'vue'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
import type { Project, ProjectCategory, ProjectStatus } from '@/types/project'
import { getCategoryLabel, getStatusLabel } from '@/utils/uiLabels'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{
  projects: Project[]
}>()

const statuses: ProjectStatus[] = ['Todo', 'In Progress', 'Done']
const categories: ProjectCategory[] = ['Bug', 'Idea', 'Task', 'Meeting', 'Reference', 'UI']

const statusChartData = computed<ChartData<'doughnut'>>(() => ({
  labels: statuses.map(getStatusLabel),
  datasets: [
    {
      data: statuses.map(
        (status) => props.projects.filter((project) => project.status === status).length,
      ),
      backgroundColor: ['#22b8f0', '#67d4f5', '#087ea4'],
      borderColor: ['#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 3,
      hoverOffset: 8,
    },
  ],
}))

const categoryChartData = computed<ChartData<'bar'>>(() => ({
  labels: categories.map(getCategoryLabel),
  datasets: [
    {
      label: 'ノート',
      data: categories.map(
        (category) => props.projects.filter((project) => project.category === category).length,
      ),
      backgroundColor: [
        'rgba(34, 184, 240, 0.82)',
        'rgba(73, 199, 240, 0.82)',
        'rgba(113, 214, 245, 0.82)',
        'rgba(8, 157, 212, 0.82)',
        'rgba(8, 126, 164, 0.82)',
        'rgba(155, 226, 248, 0.82)',
      ],
      borderColor: ['#22b8f0', '#49c7f0', '#71d6f5', '#089dd4', '#087ea4', '#9be2f8'],
      borderWidth: 0,
      borderRadius: 8,
      barThickness: 20,
    },
  ],
}))

const statusChartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '64%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#667785',
        boxWidth: 10,
        boxHeight: 10,
        padding: 18,
        font: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
          size: 11,
        },
      },
    },
    tooltip: {
      backgroundColor: '#17212b',
      borderColor: '#d7e9f2',
      borderWidth: 1,
      titleColor: '#cff3ff',
      bodyColor: '#ffffff',
      padding: 10,
    },
  },
}

const categoryChartOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#17212b',
      borderColor: '#d7e9f2',
      borderWidth: 1,
      titleColor: '#cff3ff',
      bodyColor: '#ffffff',
      padding: 10,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: {
        color: 'rgba(102, 119, 133, 0.12)',
      },
      border: {
        color: 'rgba(102, 119, 133, 0.2)',
      },
      ticks: {
        color: '#7b8b97',
        precision: 0,
        stepSize: 1,
      },
    },
    y: {
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: '#667785',
        font: {
          family: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
          size: 11,
        },
      },
    },
  },
}
</script>

<template>
  <section class="dashboard-charts" aria-label="プロジェクト統計グラフ">
    <article class="chart-card">
      <header>
        <p>ステータス別</p>
        <h3>ノートの進捗状況</h3>
      </header>
      <div class="chart-frame chart-frame--status">
        <Doughnut :data="statusChartData" :options="statusChartOptions" />
      </div>
    </article>

    <article class="chart-card">
      <header>
        <p>カテゴリ別</p>
        <h3>カテゴリごとの件数</h3>
      </header>
      <div class="chart-frame">
        <Bar :data="categoryChartData" :options="categoryChartOptions" />
      </div>
    </article>
  </section>
</template>

<style scoped>
.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.chart-card {
  position: relative;
  min-width: 0;
  padding: 1.25rem;
  overflow: hidden;
  border: 1px solid rgba(53, 91, 126, 0.72);
  border-radius: 0.5rem;
  background: linear-gradient(145deg, rgba(20, 46, 74, 0.72), rgba(8, 23, 40, 0.84));
  box-shadow:
    0 0.875rem 2rem rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(109, 221, 255, 0.08);
  backdrop-filter: blur(0.75rem);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.chart-card::before {
  position: absolute;
  top: 0;
  right: 1rem;
  left: 1rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, #1dd9ff, transparent);
  box-shadow: 0 0 0.75rem rgba(29, 217, 255, 0.55);
  content: '';
}

.chart-card:hover {
  border-color: rgba(63, 205, 240, 0.62);
  box-shadow:
    0 1rem 2.25rem rgba(0, 0, 0, 0.25),
    0 0 1.25rem rgba(29, 217, 255, 0.1);
  transform: translateY(-2px);
}

.chart-card header {
  margin-bottom: 1rem;
}

.chart-card header p {
  margin: 0 0 0.375rem;
  color: #33e4ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.11em;
}

.chart-card h3 {
  margin: 0;
  color: #dceafa;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.chart-frame {
  position: relative;
  height: 18rem;
}

.chart-frame--status {
  max-width: 22rem;
  margin: 0 auto;
}

@media (max-width: 32.5rem) {
  .chart-card {
    padding: 1rem;
  }

  .chart-frame {
    height: 16rem;
  }
}
</style>
