import * as signalR from '@microsoft/signalr'
import { hubUrl } from './apiConfig'

export function createKanbanConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl('/hubs/kanban'), {
      accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
    })
    .build()
}
