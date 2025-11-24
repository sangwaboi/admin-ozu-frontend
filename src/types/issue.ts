export interface ShipmentIssue {
  id: number;
  shipmentId: number;
  deliveryBoyId: number;
  deliveryBoyName: string;
  deliveryBoyMobile: string;
  issueType: string;
  reportedAt: string;
  adminResponse: 'redeliver' | 'return_to_shop' | null;
  adminMessage: string | null;
  adminRespondedAt: string | null;
  riderReattemptStatus: 'completed' | 'failed' | null;
  riderReattemptAt: string | null;
  status: 'reported' | 'admin_responded' | 'resolved';
  customerName: string;
  customerMobile: string;
  customerAddress: string;
}

export interface IssueRespondRequest {
  action: 'redeliver' | 'return_to_shop';
  message: string;
}

export interface IssueRespondResponse {
  status: string;
  message: string;
  issueId: number;
  action: string;
}


