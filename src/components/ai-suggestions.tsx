"use client";

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { suggestCalculatorsBasedOnUsage } from '@/ai/flows/suggest-calculators-based-on-usage';
import { Lightbulb, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { allCalculators as getAllCalculators, Calculator } from '@/lib/calculators-db';
import { Skeleton } from './ui/skeleton';
import { calculatorIcons } from '@/lib/calculator-icons';


export default function AiSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculators, setCalculators] = useState<Calculator[]>([]);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const [allCalcs, suggestionResult] = await Promise.all([
          getAllCalculators(),
          suggestCalculatorsBasedOnUsage({
            pastUsage: 'BMI Calculator',
            trendingCalculators: 'Simple Interest, Mortgage Calculator',
          })
        ]);
        
        setCalculators(allCalcs);
        const suggestedNames = suggestionResult.suggestedCalculators
          .split(',')
          .map((s) => s.trim());
        setSuggestions(suggestedNames);
      } catch (error) {
        console.error('Failed to fetch AI suggestions or calculators:', error);
        setSuggestions(['Simple Interest', 'BMI Calculator']);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  const suggestedCalculators = calculators.filter((calc) =>
    suggestions.includes(calc.name)
  );

  return (
    <section>
      <h2 className="text-3xl font-bold font-headline mb-4 flex items-center gap-2">
        <Lightbulb className="text-primary" />
        Suggested For You
      </h2>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestedCalculators.slice(0, 3).map((calc) => {
            const Icon = calculatorIcons[calc.icon] || calculatorIcons['default'];
            if (!calc.categorySlug) return null;

            return (
              <Link
                key={calc.slug}
                href={`/calculators/${calc.categorySlug}/${calc.slug}`}
              >
                <Card className="group h-full transition-all hover:bg-card/90 hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        {calc.name}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{calc.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
