/** Typed HTTP calls. Components never construct API URLs or authorization headers. */

export type DemoTaskStatus = 'running' | 'completed' | 'cancelled'

export interface DemoTask {
  task_id: string
  status: DemoTaskStatus
  progress: number
}

export interface EchoResult {
  message: string
  from: string
}

export function echoMessage(message: string): Promise<EchoResult> {
  return window.desktop.backend.request<EchoResult>('POST', '/api/echo', { message })
}

export function startDemoTask(): Promise<Pick<DemoTask, 'task_id' | 'status'>> {
  return window.desktop.backend.request('POST', '/api/tasks/demo')
}

export function getDemoTask(taskId: string): Promise<DemoTask> {
  return window.desktop.backend.request('GET', '/api/tasks/' + taskId)
}

export function cancelDemoTask(taskId: string): Promise<DemoTask> {
  return window.desktop.backend.request('POST', '/api/tasks/' + taskId + '/cancel')
}
