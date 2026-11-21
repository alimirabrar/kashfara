export type Member = {
  id: number;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  role: string;
  pointOfContact: string | null;
};

export type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: number | null;
  projectId: number | null;
};

export type Lead = {
  id: number;
  name: string;
  company: string | null;
  status: string;
  value: string;
  source: string | null;
  ownerId: number | null;
};

export type Project = {
  id: number;
  name: string;
  client: string | null;
  status: string;
  ownerId: number | null;
  dueDate: string | null;
};

export type DailyUpdate = {
  id: number;
  body: string;
  loggedDate: string;
  memberName: string | null;
  memberTitle: string | null;
};
