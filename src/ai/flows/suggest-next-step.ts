"use server";

/**
 * @fileOverview Generates a contextual next-step suggestion after a user uses a calculator.
 *
 * - suggestNextStep - A function that provides a helpful two-line tip.
 * - SuggestNextStepInput - The input type for the suggestNextStep function.
 * - SuggestNextStepOutput - The return type for the suggestNextStep function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { range } from "mathjs";
import { number, optional } from "zod";

export const SuggestNextStepInputSchema = z.object({
  calculatorName: z
    .string()
    .describe("The name of the calculator the user has just used."),

  loanAmount: z.number().optional().describe("The principal loan amount"),
  interestRate: z
    .number()
    .optional()
    .describe("The interest rate for the loan"),
  loanTerm: z.number().optional().describe("The loan term"),
  monthlyPayment: z
    .number()
    .optional()
    .describe("The calculated monthly payment amount"),
  bmi: z.number().optional().describe("The calculated BMI value"),
  category: z
    .string()
    .optional()
    .describe("The BMI category based on the calculated BMI value"),
  bmr: z.number().optional().describe("The calculated BMR value"),
  tdee: z.number().optional().describe("The calculated TDEE value"),
  activityLevel: z
    .string()
    .optional()
    .describe("The activity level used to calculate TDEE"),
  age: z.number().optional().describe("The age of the user"),
  gender: z.string().optional().describe("The gender of the user"),
  bodyFatPercentage: z
    .number()
    .optional()
    .describe("The calculated body fat percentage"),
  totalInterest: z
    .number()
    .optional()
    .describe("The total interest paid over the loan"),
  inputs: z
    .record(z.any())
    .optional()
    .describe(
      "The user input for text-based calculators like the calorie needs calculator."
    ),
  maintenanceCalories: z
    .number()
    .optional()
    .describe("The calculated maintenance calories value"),
  goal: z
    .string()
    .optional()
    .describe("The user's fitness goal for the calorie needs calculator."),
  volume: z.number().optional().describe("The calculated volume of the shape"),
  projectType: z
    .string()
    .optional()
    .describe("The type of project for the paint calculator."),
  wastePercentage: z
    .number()
    .optional()
    .describe("The waste percentage used in the paint calculator."),
  truckLoads: z
    .number()
    .optional()
    .describe("The calculated number of truck loads needed."),
  fromCurrency: z.string().optional().describe("The currency from"),
  toCurrency: z.string().optional().describe("convert to which currency"),
  amount: z.number().optional().describe(""),
  convertedAmount: z.number().optional().describe(""),
  exchangeRate: z.number().optional().describe(""),
  currentDebts: z
    .array(
      z.object({
        balance: z.number(),
        interestRate: z.number(),
        monthlyPayment: z.number(),
      })
    )
    .optional(),
  consolidationLoan: z
    .object({
      amount: z.number(),
      interestRate: z.number(),
      term: z.number(),
    })
    .optional(),
  savings: z.number().optional(),
  years: z.number().optional().describe("The age in years"),
  daysUntilNextBirthday: z
    .number()
    .optional()
    .describe("Number of days until next birthday"),
  zodiacSign: z.string().optional().describe("Zodiac sign based on birth date"),
  generation: z
    .string()
    .optional()
    .describe("Generational cohort of the person"),
  gestationalAge: z.number().optional().describe("Gestational age in weeks"),
  trimester: z.number().optional().describe("Trimester number (1, 2, or 3)"),
  dueDate: z
    .string()
    .optional()
    .describe("Estimated due date based on gestational age"),
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .optional()
    .describe("The arithmetic operation performed"),
  result: z
    .object({
      numerator: z.number(),
      denominator: z.number(),
      mixed: z.string(),
      decimal: z.string(),
      percentage: z.string(),
      calculationSteps: z.array(z.string()),
    })
    .optional()
    .describe("The result of the arithmetic operation"),
  gcd: z
    .number()
    .optional()
    .describe("The calculated gestational diabetes risk percentage"),
  isCoprime: z
    .boolean()
    .optional()
    .describe("Whether the two numbers are coprime"),
  numbers: z
    .array(z.number())
    .optional()
    .describe("The list of numbers analyzed for coprimality"),

  // ✅ GPA Calculator fields
  semesterGPA: z
    .number()
    .optional()
    .describe("The GPA for the current semester"),
  cumulativeGPA: z
    .number()
    .optional()
    .describe("The cumulative GPA including previous semesters"),
  totalCredits: z
    .number()
    .optional()
    .describe("Total number of credits attempted this semester"),
  courseCount: z
    .number()
    .optional()
    .describe("Number of courses taken this semester"),
  months: z.number().optional().describe("The age in months"),
  days: z.number().optional().describe("The age in days"),
  totalDays: z.number().optional().describe("Total days since birth"),
  totalMonths: z.number().optional().describe("Total months since birth"),
  totalWeeks: z.number().optional().describe("Total weeks since birth"),
  birthDay: z.string().optional().describe("Day of the week of birth"),
  nextBirthday: z.string().optional().describe("Formatted next birthday date"),
  isLeapYearBaby: z
    .boolean()
    .optional()
    .describe("Whether the person was born in a leap year"),
  ageInHours: z
    .number()
    .optional()
    .describe("Age in hours if birth time is provided"),
  ageInMinutes: z
    .number()
    .optional()
    .describe("Age in minutes if birth time is provided"),
  initialAmount: z
    .number()
    .optional()
    .describe("The initial amount before growth"),
  inflationRate: z.number().optional().describe("The annual inflation rate"),
  futureValue: z
    .number()
    .optional()
    .describe("The calculated future value after inflation"),
  growthMultiple: z
    .number()
    .optional()
    .describe("The multiple by which the initial amount grows"),
  loanType: z
    .enum(["personal", "auto", "mortgage", "student"])
    .optional()
    .describe("The type of loan for more tailored suggestions"),
  loanToValue: z
    .number()
    .optional()
    .describe("The loan-to-value ratio for mortgage loans"),
  // requiresPMI greater than 80%
  requiresPMI: z
    .boolean()
    .optional()
    .describe("Whether the mortgage loan requires PMI"),
  pacePerKm: z
    .string()
    .optional()
    .describe("Pace per kilometer for running calculator"),

  paceCategory: z
    .string()
    .optional()
    .describe("Pace category based on the calculated pace"),

  activityType: z
    .string()
    .optional()
    .describe("Type of activity for pace calculation"),

  distance: z.number().optional().describe("Distance covered in the activity"),
  passwordLength: z
    .number()
    .optional()
    .describe("The length of the generated password"),
  strength: z
    .string()
    .optional()
    .describe("The strength of the generated password"),
  calculationType: z
    .string()
    .optional()
    .describe(
      "The specific type of calculation performed within the calculator."
    ),
  numericValue: z
    .number()
    .optional()
    .describe("A key numeric result from the calculation, if applicable."),
  range: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional()
    .describe("The range of values considered in the calculation."),
  rangeSize: z.number().optional().describe("The size of the range of values."),
  count: z
    .number()
    .optional()
    .describe("The count of items or elements involved in the calculation."),
  currentAge: z
    .number()
    .optional()
    .describe("The current age of the user for age-related calculations."),
    retirementAge: z
    .number()
    .optional()
    .describe("The planned retirement age for retirement calculations."),
    currentSavings: z
    .number()
    .optional()
    .describe("The current savings amount for retirement calculations."),
    monthlyContribution: z
    .number()
    .optional()
    .describe("The monthly contribution amount for retirement calculations."),
    annualReturn: z
    .number()
    .optional()
    .describe("The expected annual return rate for retirement calculations."),
    retirementSavings: z
    .number()
    .optional()
    .describe("The projected retirement savings amount."),
    savingsGap: z
    .number()
    .optional()
    .describe("The gap between projected savings and retirement needs."),
    taxRate: z
    .number()
    .optional()
    .describe("The tax rate applicable to the user's income."),
    taxAmount: z
    .number()
    .optional()
    .describe("The calculated tax amount based on income and tax rate."),
    totalPrice: z
    .number()
    .optional()
    .describe("The total price after applying tax and other fees."),
    expression: z
    .string()
    .optional()
    .describe("The mathematical expression evaluated in the calculator."),
    principal: z
    .number()
    .optional()
    .describe("The principal amount used in the calculation."),
    rate: z
    .number()
    .optional()
    .describe("The rate used in the mathematical expression."),
    time: z
    .number()
    .optional()
    .describe("The time duration used in the calculation."),
    timeUnit: z
    .string()
    .optional()
    .describe("The unit of time used (e.g., years, months, days)."),
    billAmount: z
    .number()
    .optional()
    .describe("The total bill amount before tip."),
    tipPercent: z
    .number()
    .optional()
    .describe("The tip percentage to be applied to the bill amount."),
    people: z
    .number()
    .optional()
    .describe("The number of people to split the bill among."),
});
export type SuggestNextStepInput = z.infer<typeof SuggestNextStepInputSchema>;

const SuggestNextStepOutputSchema = z.object({
  suggestion: z
    .string()
    .describe(
      "A helpful, concise, two-line suggestion for the user. This could be a tip or a recommendation for another relevant calculator."
    ),
});
export type SuggestNextStepOutput = z.infer<typeof SuggestNextStepOutputSchema>;

export async function suggestNextStep(
  input: SuggestNextStepInput
): Promise<SuggestNextStepOutput> {
  return suggestNextStepFlow(input);
}

const prompt = ai.definePrompt({
  name: "suggestNextStepPrompt",
  input: { schema: SuggestNextStepInputSchema },
  output: { schema: SuggestNextStepOutputSchema },
  prompt: `A user just finished using the "{{calculatorName}}".

  Provide a helpful and concise two-line suggestion for their next step. This could be a practical tip related to their result, or a recommendation for another relevant calculator in the app.

  Keep the tone encouraging and straightforward.`,
});

const suggestNextStepFlow = ai.defineFlow(
  {
    name: "suggestNextStepFlow",
    inputSchema: SuggestNextStepInputSchema,
    outputSchema: SuggestNextStepOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
