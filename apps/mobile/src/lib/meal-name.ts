const mealNameKeys: Record<string, string> = {
  "śniadanie": "planner.breakfast",
  "drugie śniadanie": "planner.secondBreakfast",
  "obiad": "planner.lunch",
  "podwieczorek": "planner.afternoonSnack",
  "kolacja": "planner.dinner",
};

export function mealNameKey(name: string) {
  return mealNameKeys[name.trim().toLocaleLowerCase("pl-PL")];
}
