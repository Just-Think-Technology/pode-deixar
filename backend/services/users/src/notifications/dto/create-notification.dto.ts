export class CreateNotificationDto {
  recipient: string;
  type: 'BUDGET' | 'PROPOSAL_ACCEPTED' | 'SERVICE_COMPLETED' | 'NEW_MESSAGE';
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: 'ORDER' | 'PROPOSAL' | 'REVIEW';
}