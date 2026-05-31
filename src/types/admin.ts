export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalTopics: number
  totalDocuments: number
  totalEnrollments: number
  proficiencyRate: number
  avgQuizScore: number
  completionRate: number
}

export interface UserProgressSummary {
  userId: string
  userName: string | null
  email: string
  role: string
  enrollments: number
  completedTopics: number
  avgScore: number
  lastActivityAt: string | null
}

export interface TopicAnalytics {
  topicId: string
  topicName: string
  enrollments: number
  completions: number
  avgScore: number
  avgTimeMinutes: number
  proficiencyRate: number
}

export interface ReportFilter {
  startDate?: string
  endDate?: string
  teamId?: string
  userId?: string
  topicId?: string
  role?: string
}
