// This file is used for database seeding purposes only.
// Real-time calculator data is fetched from Firestore via `lib/calculators-db.ts`.

import {
  PiggyBank,
  HeartPulse,
  Sigma,
  Dumbbell,
  HardHat,
  FunctionSquare,
  Calculator as CalculatorIcon,
  Cake,
  Droplets,
  Building,
  Home,
  Landmark,
  Car,
  TrendingUp,
  LineChart,
  CalendarClock,
  Wallet,
  AreaChart,
  Receipt,
  Flame,
  Baby,
  PersonStanding,
  Minus,
  Percent,
  Divide,
  FlaskConical,
  Shuffle,
  ArrowRightLeft,
  Footprints,
  Briefcase,
  GitCommit,
  Wrench,
  KeyRound,
  HandCoins,
  Table,
  CarFront,
} from "lucide-react";
import BmiCalculator from "@/components/calculators/bmi-calculator";
import SimpleInterestCalculator from "@/components/calculators/simple-interest-calculator";
import DobCalculator from "@/components/calculators/dob-calculator";
import PeriodCalculator from "@/components/calculators/period-calculator";
import ConcreteCalculator from "@/components/calculators/concrete-calculator";
import MortgageCalculator from "@/components/calculators/mortgage-calculator";
import LoanCalculator from "@/components/calculators/loan-calculator";
import RetirementCalculator from "@/components/calculators/retirement-calculator";
import CalorieCalculator from "@/components/calculators/calorie-calculator";
import DueDateCalculator from "@/components/calculators/due-date-calculator";
import BodyFatCalculator from "@/components/calculators/body-fat-calculator";
import BmrCalculator from "@/components/calculators/bmr-calculator";
import PercentageCalculator from "@/components/calculators/percentage-calculator";
import FractionCalculator from "@/components/calculators/fraction-calculator";
import ScientificCalculator from "@/components/calculators/scientific-calculator";
import RandomNumberGenerator from "@/components/calculators/random-number-generator";
import CurrencyConverter from "@/components/calculators/currency-converter";
import InvestmentCalculator from "@/components/calculators/investment-calculator";
import PaceCalculator from "@/components/calculators/pace-calculator";
import GcdCalculator from "@/components/calculators/gcd-calculator";
import IdealWeightCalculator from "@/components/calculators/ideal-weight-calculator";
import SalesTaxCalculator from "@/components/calculators/sales-tax-calculator";
import PasswordGenerator from "@/components/calculators/password-generator";
import TipCalculator from "@/components/calculators/tip-calculator";
import AmortizationCalculator from "@/components/calculators/amortization-calculator";
import InflationCalculator from "@/components/calculators/inflation-calculator";
import AutoLoanCalculator from "@/components/calculators/auto-loan-calculator";
import DebtConsolidationCalculator from "@/components/calculators/debt-consolidation";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface Calculator {
  name: string;
  slug: string;
  description: string;
  component: ComponentType;
  icon: LucideIcon;
  categorySlug?: string;
}

export interface CalculatorCategory {
  name: string;
  slug: string;
  description: string;
  icon: LucideIcon;
  calculators: Calculator[];
}

export const initialCalculatorData: Omit<CalculatorCategory, "calculators">[] =
  [
    {
      name: "Finance",
      slug: "finance",
      description: "Calculators for loans, investments, and savings.",
      icon: PiggyBank,
    },
    {
      name: "Health",
      slug: "health",
      description: "Monitor your health and wellness with these tools.",
      icon: HeartPulse,
    },
    {
      name: "Math",
      slug: "math",
      description: "Solve mathematical problems from basic to advanced.",
      icon: Sigma,
    },
    {
      name: "Fitness",
      slug: "fitness",
      description: "Track your fitness goals and progress.",
      icon: Dumbbell,
    },
    {
      name: "Construction",
      slug: "construction",
      description: "Calculators for building and construction projects.",
      icon: HardHat,
    },
    {
      name: "Utilities",
      slug: "utilities",
      description: "Handy tools for various everyday tasks.",
      icon: Wrench,
    },
    {
      name: "Other",
      slug: "other",
      description: "A collection of other useful calculators.",
      icon: FunctionSquare,
    },
  ];

export interface SeedCalculator extends Omit<Calculator, "component" | "icon"> {
  componentName: string;
  iconName: string;
}

export const initialCalculators: SeedCalculator[] = [
  {
    name: "Simple Interest",
    slug: "simple-interest",
    description: "Calculate simple interest on a loan or investment.",
    categorySlug: "finance",
    componentName: "SimpleInterestCalculator",
    iconName: "CalculatorIcon",
  },
  {
    name: "Debt Consolidation",
    slug: "debt-consolidation",
    description: "Plan and manage your debt consolidation strategy.",
    categorySlug: "finance",
    componentName: "DebtConsolidationCalculator",
    iconName: "LineChart",
  },
  {
    name: "Mortgage Calculator",
    slug: "mortgage-calculator",
    description: "Estimate your monthly mortgage payments.",
    categorySlug: "finance",
    componentName: "MortgageCalculator",
    iconName: "Home",
  },
  {
    name: "Loan Calculator",
    slug: "loan-calculator",
    description: "Calculate payments for any type of loan.",
    categorySlug: "finance",
    componentName: "LoanCalculator",
    iconName: "Landmark",
  },
  {
    name: "Auto Loan Calculator",
    slug: "auto-loan-calculator",
    description: "Estimate payments for your new car.",
    categorySlug: "finance",
    componentName: "AutoLoanCalculator",
    iconName: "CarFront",
  },
  {
    name: "Amortization Calculator",
    slug: "amortization-calculator",
    description: "View a detailed loan amortization schedule.",
    categorySlug: "finance",
    componentName: "AmortizationCalculator",
    iconName: "Table",
  },
  {
    name: "Investment Calculator",
    slug: "investment-calculator",
    description: "Project the growth of your investments over time.",
    categorySlug: "finance",
    componentName: "InvestmentCalculator",
    iconName: "Briefcase",
  },
  {
    name: "Retirement Calculator",
    slug: "retirement-calculator",
    description: "Plan and estimate your retirement savings.",
    categorySlug: "finance",
    componentName: "RetirementCalculator",
    iconName: "CalendarClock",
  },
  {
    name: "Inflation Calculator",
    slug: "inflation-calculator",
    description: "See how inflation affects your purchasing power.",
    categorySlug: "finance",
    componentName: "InflationCalculator",
    iconName: "TrendingUp",
  },
  {
    name: "USD to PKR Converter",
    slug: "usd-to-pkr-converter",
    description: "Convert US Dollars to Pakistani Rupees.",
    categorySlug: "finance",
    componentName: "CurrencyConverter",
    iconName: "ArrowRightLeft",
  },
  {
    name: "Sales Tax Calculator",
    slug: "sales-tax-calculator",
    description: "Quickly calculate sales tax and total price.",
    categorySlug: "finance",
    componentName: "SalesTaxCalculator",
    iconName: "Receipt",
  },
  {
    name: "BMI Calculator",
    slug: "bmi-calculator",
    description: "Calculate your Body Mass Index.",
    categorySlug: "health",
    componentName: "BmiCalculator",
    iconName: "CalculatorIcon",
  },
  {
    name: "Period & Ovulation",
    slug: "period-calculator",
    description: "Estimate your next period and fertile window.",
    categorySlug: "health",
    componentName: "PeriodCalculator",
    iconName: "Droplets",
  },
  {
    name: "Calorie Calculator",
    slug: "calorie-calculator",
    description:
      "Estimate your daily calorie needs for maintenance or weight loss.",
    categorySlug: "health",
    componentName: "CalorieCalculator",
    iconName: "Flame",
  },
  {
    name: "Due Date Calculator",
    slug: "due-date-calculator",
    description: "Estimate your pregnancy due date.",
    categorySlug: "health",
    componentName: "DueDateCalculator",
    iconName: "Baby",
  },
  {
    name: "Body Fat Calculator",
    slug: "body-fat-calculator",
    description:
      "Estimate your body fat percentage using the U.S. Navy method.",
    categorySlug: "health",
    componentName: "BodyFatCalculator",
    iconName: "PersonStanding",
  },
  {
    name: "BMR Calculator",
    slug: "bmr-calculator",
    description: "Calculate your Basal Metabolic Rate (BMR).",
    categorySlug: "health",
    componentName: "BmrCalculator",
    iconName: "Minus",
  },
  {
    name: "Ideal Weight Calculator",
    slug: "ideal-weight-calculator",
    description: "Find your ideal weight based on height and gender.",
    categorySlug: "health",
    componentName: "IdealWeightCalculator",
    iconName: "Dumbbell",
  },
  {
    name: "Percentage Calculator",
    slug: "percentage-calculator",
    description: "Calculate percentages for various scenarios.",
    categorySlug: "math",
    componentName: "PercentageCalculator",
    iconName: "Percent",
  },
  {
    name: "Fraction Calculator",
    slug: "fraction-calculator",
    description: "Add, subtract, multiply, and divide fractions.",
    categorySlug: "math",
    componentName: "FractionCalculator",
    iconName: "Divide",
  },
  {
    name: "Scientific Calculator",
    slug: "scientific-calculator",
    description:
      "A powerful calculator for scientific and engineering calculations.",
    categorySlug: "math",
    componentName: "ScientificCalculator",
    iconName: "FlaskConical",
  },
  {
    name: "Random Number Generator",
    slug: "random-number-generator",
    description: "Generate a random number within a specified range.",
    categorySlug: "math",
    componentName: "RandomNumberGenerator",
    iconName: "Shuffle",
  },
  {
    name: "GCD Calculator",
    slug: "gcd-calculator",
    description: "Find the Greatest Common Divisor of two integers.",
    categorySlug: "math",
    componentName: "GcdCalculator",
    iconName: "GitCommit",
  },
  {
    name: "Pace Calculator",
    slug: "pace-calculator",
    description: "Calculate your running pace, time, or distance.",
    categorySlug: "fitness",
    componentName: "PaceCalculator",
    iconName: "Footprints",
  },
  {
    name: "Concrete Calculator",
    slug: "concrete-calculator",
    description: "Estimate the volume of concrete needed for a project.",
    categorySlug: "construction",
    componentName: "ConcreteCalculator",
    iconName: "Building",
  },
  {
    name: "Password Generator",
    slug: "password-generator",
    description: "Create strong, random passwords to enhance your security.",
    categorySlug: "utilities",
    componentName: "PasswordGenerator",
    iconName: "KeyRound",
  },
  {
    name: "Tip Calculator",
    slug: "tip-calculator",
    description: "Calculate tips and split the bill between friends.",
    categorySlug: "utilities",
    componentName: "TipCalculator",
    iconName: "HandCoins",
  },
  {
    name: "Date of Birth",
    slug: "dob-calculator",
    description: "Calculate your age and see details about your birthday.",
    categorySlug: "other",
    componentName: "DobCalculator",
    iconName: "Cake",
  },
];
