import * as signalR from '@microsoft/signalr'

export function createKanbanConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl('/hubs/kanban', {
      accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
    })
    .withAutomaticReconnect()
    .build()
}
