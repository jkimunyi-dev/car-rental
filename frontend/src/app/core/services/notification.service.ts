import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();

  success(message: string, title?: string): void {
    this.showNotification({
      type: 'success',
      message,
      title: title || 'Success',
      duration: 5000
    });
  }

  error(message: string, title?: string): void {
    this.showNotification({
      type: 'error',
      message,
      title: title || 'Error',
      duration: 7000
    });
  }

  warning(message: string, title?: string): void {
    this.showNotification({
      type: 'warning',
      message,
      title: title || 'Warning',
      duration: 6000
    });
  }

  info(message: string, title?: string): void {
    this.showNotification({
      type: 'info',
      message,
      title: title || 'Info',
      duration: 5000
    });
  }

  private showNotification(notification: Notification): void {
    this.notificationSubject.next(notification);
  }
}

interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title: string;
  duration: number;
}