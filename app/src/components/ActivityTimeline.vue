<script setup lang="ts">
import { computed } from 'vue'
import ActivityItem from '@/components/ActivityItem.vue'
import type { Activity } from '@/types/activity'

const props = withDefaults(
  defineProps<{
    activities: Activity[]
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

interface ActivityGroup {
  key: string
  label: string
  activities: Activity[]
}

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

const getGroupLabel = (date: Date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activityDay = new Date(date)
  activityDay.setHours(0, 0, 0, 0)
  const differenceInDays = Math.round(
    (today.getTime() - activityDay.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (differenceInDays === 0) {
    return '今日'
  }

  if (differenceInDays === 1) {
    return '昨日'
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const groupedActivities = computed<ActivityGroup[]>(() => {
  const groups = new Map<string, ActivityGroup>()

  props.activities.forEach((activity) => {
    const date = activity.createdAt?.toDate()
    const key = date ? getDateKey(date) : 'pending'
    const label = date ? getGroupLabel(date) : '日時を確認中'
    const currentGroup = groups.get(key)

    if (currentGroup) {
      currentGroup.activities.push(activity)
    } else {
      groups.set(key, { key, label, activities: [activity] })
    }
  })

  return Array.from(groups.values())
})
</script>

<template>
  <div class="activity-timeline" :class="{ 'activity-timeline--compact': compact }">
    <section
      v-for="group in groupedActivities"
      :key="group.key"
      class="activity-group"
      :aria-labelledby="compact ? undefined : `activity-group-${group.key}`"
    >
      <h2 v-if="!compact" :id="`activity-group-${group.key}`">{{ group.label }}</h2>
      <ol>
        <li v-for="activity in group.activities" :key="activity.id">
          <ActivityItem :activity="activity" :compact="compact" />
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.activity-timeline {
  display: grid;
  gap: 1.5rem;
}

.activity-group h2 {
  margin: 0 0 0.75rem;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 750;
}

.activity-group ol {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-timeline--compact,
.activity-timeline--compact .activity-group ol {
  gap: 0.35rem;
}
</style>
