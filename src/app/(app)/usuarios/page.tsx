import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { NewUser, UserRow } from "@/features/users/user-forms";
import { ROLE } from "@/lib/labels";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const me = await requirePageRole("ADMIN");
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], take: 500, select: { id: true, name: true, email: true, role: true, active: true } });
  return (
    <>
      <PageHeader
       
        title="Usuarios"
        description="Operador: modo bodega y consulta · Supervisor: + pedidos, olas, ajustes, recepciones · Administrador: todo."
        actions={<NewUser />}
      />
      <Card>
        <Table>
          <thead><tr><Th>Nombre</Th><Th>Correo</Th><Th>Rol</Th><Th>Estado</Th><Th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td className="font-semibold">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-muted">(tú)</span>}</Td>
                <Td className="text-muted">{u.email}</Td>
                <Td>{ROLE[u.role]}</Td>
                <Td>{u.active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
                <Td className="text-right"><UserRow user={u} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
