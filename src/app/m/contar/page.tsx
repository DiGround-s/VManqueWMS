import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { LocationCounter } from "@/features/inventory/location-counter";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle sub="Cuenta lo que hay en una ubicación. Las diferencias se ajustan solas.">Contar</PhoneTitle>
      <LocationCounter mode="count" phone />
    </>
  );
}
