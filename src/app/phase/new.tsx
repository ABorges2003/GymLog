import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { PhaseForm } from "@/components/phase-form";
import { createPhase } from "@/db/repositories/body-weight-phases";
import { toDateKey } from "@/lib/dates";

// New body weight phase, starting today by default.
export default function NewPhaseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  return (
    <PhaseForm
      initial={{ name: "", startDate: toDateKey(new Date()), endDate: null }}
      submitLabel="Criar época"
      onSubmit={async (phase) => {
        const id = await createPhase(db, phase);
        router.replace({
          pathname: "/phase/[id]",
          params: { id },
        });
      }}
    />
  );
}
