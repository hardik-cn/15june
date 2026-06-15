export interface TicketReply {
  replyid: string;
  userid: string;
  name: string;
  email: string;
  requestor_name: string;
  requestor_email: string;
  requestor_type: string; // "Owner" | "Operator" | "Contact"
  date: string;
  message: string;
  attachment: string;
  attachments: { filename: string; index: number }[] | [[]];
  attachments_removed: boolean;
  admin: string;
  rating?: string;
}

export interface TicketNote {
  noteid: string;
  date: string;
  message: string;
  attachment: string;
  attachments: any[];
  attachments_removed: boolean;
  admin: string;
}

export interface TicketDetail {
  ticketid: string;
  tid: string;
  c: string;
  deptid: string;
  deptname: string;
  userid: string;
  name: string;
  email: string;
  requestor_name: string;
  requestor_type: string;
  requestor_email: string;
  cc: string;
  date: string;
  subject: string;
  status: string;
  priority: string;
  admin: string;
  lastreply: string;
  flag: string;
  service: string;
  replies: TicketReply[];
  notes: TicketNote[];
  customfields: { id: string; name: string; value: string }[];
}
