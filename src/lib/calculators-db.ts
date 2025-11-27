import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import BmiCalculator from '@/components/calculators/bmi-calculator';
import SimpleInterestCalculator from '@/components/calculators/simple-interest-calculator';
import DobCalculator from '@/components/calculators/dob-calculator';
import PeriodCalculator from '@/components/calculators/period-calculator';
import ConcreteCalculator from '@/components/calculators/concrete-calculator';
import MortgageCalculator from '@/components/calculators/mortgage-calculator';
import LoanCalculator from '@/components/calculators/loan-calculator';
import RetirementCalculator from '@/components/calculators/retirement-calculator';
import CalorieCalculator from '@/components/calculators/calorie-calculator';
import DueDateCalculator from '@/components/calculators/due-date-calculator';
import BodyFatCalculator from '@/components/calculators/body-fat-calculator';
import BmrCalculator from '@/components/calculators/bmr-calculator';
import PercentageCalculator from '@/components/calculators/percentage-calculator';
import FractionCalculator from '@/components/calculators/fraction-calculator';
import ScientificCalculator from '@/components/calculators/scientific-calculator';
import RandomNumberGenerator from '@/components/calculators/random-number-generator';
import CurrencyConverter from '@/components/calculators/currency-converter';
import InvestmentCalculator from '@/components/calculators/investment-calculator';
import PaceCalculator from '@/components/calculators/pace-calculator';
import GcdCalculator from '@/components/calculators/gcd-calculator';
import IdealWeightCalculator from '@/components/calculators/ideal-weight-calculator';
import SalesTaxCalculator from '@/components/calculators/sales-tax-calculator';
import PasswordGenerator from '@/components/calculators/password-generator';
import TipCalculator from '@/components/calculators/tip-calculator';
import AmortizationCalculator from '@/components/calculators/amortization-calculator';
import InflationCalculator from '@/components/calculators/inflation-calculator';
import AutoLoanCalculator from '@/components/calculators/auto-loan-calculator';
import DebtConsolidationCalculator from '@/components/calculators/debt-consolidation';
import GPACalculator from '@/components/calculators/gpa-calculator';
import FutureValueCalculator from '@/components/calculators/future-value-calculator';
import CalorieBurnCalculator from '@/components/calculators/calorie-burn-calculator';
import ConversionCalculator from '@/components/calculators/conversion-calculator';
import KgToLbCalculator from '@/components/calculators/kg-to-lb-calculator';

// Component mapping for dynamic loading
const calculatorComponents = {
  BmiCalculator,
  SimpleInterestCalculator,
  DobCalculator,
  PeriodCalculator,
  ConcreteCalculator,
  MortgageCalculator,
  LoanCalculator,
  RetirementCalculator,
  CalorieCalculator,
  DueDateCalculator,
  BodyFatCalculator,
  BmrCalculator,
  PercentageCalculator,
  FractionCalculator,
  ScientificCalculator,
  RandomNumberGenerator,
  CurrencyConverter,
  InvestmentCalculator,
  PaceCalculator,
  GcdCalculator,
  IdealWeightCalculator,
  SalesTaxCalculator,
  PasswordGenerator,
  TipCalculator,
  AmortizationCalculator,
  InflationCalculator,
  AutoLoanCalculator,
  DebtConsolidationCalculator,
  GPACalculator,
  FutureValueCalculator,
  CalorieBurnCalculator,
  ConversionCalculator,
  KgToLbCalculator,
};

export function getCalculatorComponents() {
  return calculatorComponents;
}

export interface Calculator {
  id: string;
  name: string;
  slug: string;
  description: string;
  component: string;
  icon: string;
  categorySlug: string;
}

export interface CalculatorCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  calculators: Calculator[];
}

// In-memory caches (cleared on server restart)
let allCalculatorsCache: Calculator[] | null = null;
let calculatorCategoriesCache: CalculatorCategory[] | null = null;

// Local calculators (fallback if Firestore is unavailable)
const localCalculators: Calculator[] = [
  {
    id: 'debt-consolidation',
    name: 'Debt Consolidation',
    slug: 'debt-consolidation',
    description: 'Plan and manage your debt consolidation strategy.',
    component: 'DebtConsolidationCalculator',
    icon: 'LineChart',
    categorySlug: 'finance'
  },
  {
    id: 'kg-to-lb-calculator',
    name: 'Kg to Lb Calculator',
    slug: 'kg-to-lb-calculator',
    description: 'Convert kilograms to pounds quickly and easily.',
    component: 'KgToLbCalculator',
    icon: 'BalanceScale',
    categorySlug: 'health'
  },
  {
    id: 'gpa-calculator',
    name: 'GPA Calculator',
    slug: 'gpa-calculator',
    description: 'Calculate your Grade Point Average (GPA) easily.',
    component: 'GPACalculator',
    icon: 'BookOpen',
    categorySlug: 'math'
  },
  {
    id: 'future-value-calculator',
    name: 'Future Value Calculator',
    slug: 'future-value-calculator',
    description: 'Determine the future value of your investments over time.',
    component: 'FutureValueCalculator',
    icon: 'TrendingUp',
    categorySlug: 'finance'
  },
  {
    id: 'calorie-burn-calculator',
    name: 'Calorie Burn Calculator',
    slug: 'calorie-burn-calculator',
    description: 'Estimate the number of calories burned during various activities.',
    component: 'CalorieBurnCalculator',
    icon: 'Fire',
    categorySlug: 'health'
  },
  {
    id: 'conversion-calculator',
    name: 'Conversion Calculator',
    slug: 'conversion-calculator',
    description: 'Convert between various units of measurement easily.',
    component: 'ConversionCalculator',
    icon: 'Repeat',
    categorySlug: 'finance'
  },
];

/**
 * Fetches all calculators from Firestore and merges with local calculators
 * @returns Combined list of all calculators
 */
export async function allCalculators(): Promise<Calculator[]> {
  // Return cached data if available
  if (allCalculatorsCache) {
    return [...allCalculatorsCache];
  }

  try {
    // Fetch from Firestore
    const calculatorsCol = collection(db, 'calculators');
    const calculatorSnapshot = await getDocs(calculatorsCol);
    const firestoreCalculators = calculatorSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Calculator));

    // Merge: Firestore calculators + local calculators not in Firestore
    const combinedCalculators = [
      ...firestoreCalculators,
      ...localCalculators.filter(localCalc =>
        !firestoreCalculators.some(firestoreCalc => firestoreCalc.slug === localCalc.slug)
      )
    ];

    // Cache the result
    allCalculatorsCache = combinedCalculators;
    return [...combinedCalculators];

  } catch (error) {
    console.error('Failed to fetch calculators from Firestore:', error);
    
    // Fallback to local calculators only
    console.warn('Using local calculators as fallback');
    allCalculatorsCache = localCalculators;
    return [...localCalculators];
  }
}

/**
 * Fetches all categories with their associated calculators
 * @returns List of calculator categories
 */
export async function getCalculatorCategories(): Promise<CalculatorCategory[]> {
  // Return cached data if available
  if (calculatorCategoriesCache) {
    return [...calculatorCategoriesCache];
  }

  try {
    // Fetch categories from Firestore
    const categoriesCol = query(collection(db, 'calculator_categories'), orderBy('name'));
    const categorySnapshot = await getDocs(categoriesCol);

    // Get all calculators (with fallback)
    const allCalcs = await allCalculators();

    // Map categories with their calculators
    const categoryList = categorySnapshot.docs.map(doc => {
      const categoryData = doc.data();
      const slug = categoryData.slug;
      const calculatorsForCategory = allCalcs.filter(calc => calc.categorySlug === slug);

      return {
        id: doc.id,
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        icon: categoryData.icon,
        calculators: calculatorsForCategory,
      } as CalculatorCategory;
    });

    // Cache the result
    calculatorCategoriesCache = categoryList;
    return [...categoryList];

  } catch (error) {
    console.error('Failed to fetch calculator categories from Firestore:', error);

    // Fallback: Group local calculators by category
    const allCalcs = await allCalculators();
    const categoryMap = new Map<string, CalculatorCategory>();

    allCalcs.forEach(calc => {
      if (!categoryMap.has(calc.categorySlug)) {
        categoryMap.set(calc.categorySlug, {
          id: calc.categorySlug,
          name: calc.categorySlug.charAt(0).toUpperCase() + calc.categorySlug.slice(1),
          slug: calc.categorySlug,
          description: `${calc.categorySlug} calculators`,
          icon: 'Calculator',
          calculators: []
        });
      }
      categoryMap.get(calc.categorySlug)!.calculators.push(calc);
    });

    const fallbackCategories = Array.from(categoryMap.values());
    calculatorCategoriesCache = fallbackCategories;
    return [...fallbackCategories];
  }
}

/**
 * Returns only local calculators (useful for testing)
 */
export function getLocalCalculators(): Calculator[] {
  return [...localCalculators];
}

/**
 * Clears the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  allCalculatorsCache = null;
  calculatorCategoriesCache = null;
}