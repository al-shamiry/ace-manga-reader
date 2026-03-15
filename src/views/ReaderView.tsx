import { useParams, useNavigate } from "@solidjs/router";
import { ArrowLeft } from "lucide-solid";
import { Button } from "../components/Button";

export function ReaderView() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div class="flex flex-col items-center justify-center flex-1 gap-4 text-zinc-500">
      <p class="text-sm">Reader coming in Stage 2 — comic ID: {params.id}</p>
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} />
        Back
      </Button>
    </div>
  );
}
