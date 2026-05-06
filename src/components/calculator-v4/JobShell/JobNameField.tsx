import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { Input } from "../../ui/Input";

export function JobNameField() {
  const { state, dispatch } = useCalculatorV4();

  return (

    <Input
      type="text"
      placeholder="Enter job name"
      value={state.jobName}
      onChange={(e) => dispatch({ type: "SET_JOB_NAME", name: e.target.value })}
      className="rounded-none px-0 w-full bg-transparent focus:ring-0 border-b-2 border-transparent border-t-0 border-l-0 border-r-0 hover:border-brand-border border-dashed focus:border-b-2 border-dashed focus:border-brand-border"
      data-testid="v4-job-name"
    />
  );
}
