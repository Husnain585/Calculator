import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCalculatorCategories } from '@/lib/calculators-db';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AiSuggestions from '@/components/ai-suggestions';
import { calculatorIcons } from '@/lib/calculator-icons';

async function CategoryCard({
  category,
}: {
  category: Awaited<ReturnType<typeof getCalculatorCategories>>[0];
}) {
  const CategoryIcon = calculatorIcons[category.icon] || calculatorIcons['default'];
  return (
    <Link href={`/calculators/${category.slug}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="p-4">
          <div className="flex items-center gap-3">
            <CategoryIcon className="h-8 w-8 text-primary" />
            <CardTitle className="text-xl font-medium">{category.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-muted-foreground">{category.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function Home() {
  const calculatorCategories = await getCalculatorCategories();
  
  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl font-headline">
          Welcome to OmniCalc
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your one-stop destination for a comprehensive collection of free online calculators designed for every need.
        </p>
         <div className="mt-8 flex gap-4 justify-center">
            <Button size="lg" asChild>
                <Link href="/calculators">Browse Calculators</Link>
            </Button>
             <Button size="lg" variant="outline" asChild>
                <Link href="/register">Get Started</Link>
            </Button>
        </div>
      </section>

      <AiSuggestions />

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold font-headline">
            Calculator Categories
          </h2>
          <Button variant="link" asChild>
            <Link href="/calculators">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {calculatorCategories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </section>
    </div>
  );
}
