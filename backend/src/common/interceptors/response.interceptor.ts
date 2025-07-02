import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      map((data) => {
        // If data is already an ApiResponse, return it as is
        if (data && typeof data === 'object' && 'success' in data && 'message' in data) {
          return data;
        }
        
        // Otherwise, wrap it in ApiResponse
        const response = ApiResponse.success(data);
        response.path = request.url;
        return response;
      }),
    );
  }
}