import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  addClientService,
} from "../clients/functions";
import { getServices, saveService } from "../services/functions";
import { getTeam, getRoles } from "../team/functions";
export const keys = {
  clients: (org: string) => ["org", org, "clients"] as const,
  detail: (org: string, id: string) => ["org", org, "client", id] as const,
  services: (org: string) => ["org", org, "services"] as const,
  team: (org: string) => ["org", org, "team"] as const,
  roles: (org: string) => ["org", org, "roles"] as const,
};
export const clientListOptions = (org: string, search = "", page = 1) =>
  queryOptions({
    queryKey: [...keys.clients(org), { search, page }],
    queryFn: () => getClients({ data: { search, page } }),
    staleTime: 15000,
    retry: 1,
  });
export const clientOptions = (org: string, id: string) =>
  queryOptions({
    queryKey: keys.detail(org, id),
    queryFn: () => getClient({ data: { id } }),
    retry: 1,
  });
export const serviceOptions = (org: string) =>
  queryOptions({
    queryKey: keys.services(org),
    queryFn: () => getServices(),
    staleTime: 30000,
    retry: 1,
  });
export const teamOptions = (org: string) =>
  queryOptions({ queryKey: keys.team(org), queryFn: () => getTeam(), staleTime: 30000, retry: 1 });
export const roleOptions = (org: string) =>
  queryOptions({
    queryKey: keys.roles(org),
    queryFn: () => getRoles(),
    staleTime: 30000,
    retry: 1,
  });
export function useCreateClient(org: string) {
  const q = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.clients(org) }),
  });
}
export function useUpdateClient(org: string) {
  const q = useQueryClient();
  return useMutation({
    mutationFn: updateClient,
    onSuccess: async ({ id }) => {
      await Promise.all([
        q.invalidateQueries({ queryKey: keys.clients(org) }),
        q.invalidateQueries({ queryKey: keys.detail(org, id) }),
      ]);
    },
  });
}
export function useAddClientService(org: string) {
  const q = useQueryClient();
  return useMutation({
    mutationFn: addClientService,
    onSuccess: ({ id }) => q.invalidateQueries({ queryKey: keys.detail(org, id) }),
  });
}
export function useSaveService(org: string) {
  const q = useQueryClient();
  return useMutation({
    mutationFn: saveService,
    onSuccess: () => q.invalidateQueries({ queryKey: keys.services(org) }),
  });
}
