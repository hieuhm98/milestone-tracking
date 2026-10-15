import ApiPractice from "@/components/sandbox/ApiPractice";
import { workedExamples } from "@/lib/sandbox/examples";

/**
 * The worked examples are produced here, on the server, by running the real
 * engine — so every request/response the guide shows is one the API gives.
 */
export default function ApiPracticePage() {
  const { operations, mistakes } = workedExamples();

  return <ApiPractice operations={operations} mistakes={mistakes} />;
}
