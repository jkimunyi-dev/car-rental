import { SetMetadata } from '@nestjs/common';

export const VERIFIED_USER_KEY = 'verifiedUser';
export const VerifiedUser = () => SetMetadata(VERIFIED_USER_KEY, true);