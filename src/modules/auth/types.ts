export type TeamMember = {
  id: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
};
export type SessionState =
  | { status: "unconfigured" | "anonymous" | "no_access"; member: null }
  | { status: "authenticated"; member: TeamMember };
