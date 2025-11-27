import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { ComponentType } from 'react';
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


// We can't store functions (React components) in Firestore,
// so we map the component string from the DB to the actual component here.
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

const allCalculatorsCache: Calculator[] = [];
const calculatorCategoriesCache: CalculatorCategory[] = [];

// Local calculators that aren't in Firestore yet
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

// Fetches all calculators from Firestore and combines with local calculators
export async function allCalculators(): Promise<Calculator[]> {
  if (allCalculatorsCache.length > 0) {
    return allCalculatorsCache;
  }
  
  const calculatorsCol = collection(db, 'calculators');
  const calculatorSnapshot = await getDocs(calculatorsCol);
  const firestoreCalculators = calculatorSnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as Calculator));
  
  // Combine Firestore calculators with local calculators
  // Filter out any local calculators that already exist in Firestore
  const combinedCalculators = [
    ...firestoreCalculators,
    ...localCalculators.filter(localCalc => 
      !firestoreCalculators.some(firestoreCalc => firestoreCalc.slug === localCalc.slug)
    )
  ];
  
  allCalculatorsCache.push(...combinedCalculators);
  return combinedCalculators;
}

// Fetches all categories and their associated calculators from Firestore
export async function getCalculatorCategories(): Promise<CalculatorCategory[]> {
    if (calculatorCategoriesCache.length > 0) {
        return calculatorCategoriesCache;
    }
  const categoriesCol = query(collection(db, 'calculator_categories'), orderBy('name'));
  const categorySnapshot = await getDocs(categoriesCol);
  
  const allCalcs = await allCalculators();

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

  calculatorCategoriesCache.push(...categoryList);
  return categoryList;
}

// Export local calculators for direct access if needed
export function getLocalCalculators(): Calculator[] {
  return localCalculators;
}