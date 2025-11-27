"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  Lightbulb,
  History,
  Ruler,
  Scale,
  Thermometer,
  Zap,
  Clock,
  Droplets,
} from "lucide-react";
import { suggestNextStep } from "@/ai/flows/suggest-next-step";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  category: z.enum([
    "length",
    "weight",
    "temperature",
    "volume",
    "time",
    "energy",
  ]),
  fromUnit: z.string().min(1, "Please select a unit"),
  toUnit: z.string().min(1, "Please select a unit"),
  value: z.coerce.number().min(0, "Value must be positive"),
});

type FormValues = z.infer<typeof formSchema>;

type ConversionResult = {
  convertedValue: number;
  formula: string;
  precision: number;
};

type ConversionHistory = {
  fromValue: number;
  fromUnit: string;
  toValue: number;
  toUnit: string;
  category: string;
  timestamp: Date;
};

// Conversion factors and units
const CONVERSION_DATA = {
  length: {
    units: [
      "meters",
      "kilometers",
      "centimeters",
      "millimeters",
      "miles",
      "yards",
      "feet",
      "inches",
    ],
    conversions: {
      meters: 1,
      kilometers: 0.001,
      centimeters: 100,
      millimeters: 1000,
      miles: 0.000621371,
      yards: 1.09361,
      feet: 3.28084,
      inches: 39.3701,
    },
    icon: Ruler,
  },
  weight: {
    units: ["kilograms", "grams", "milligrams", "pounds", "ounces", "stones"],
    conversions: {
      kilograms: 1,
      grams: 1000,
      milligrams: 1000000,
      pounds: 2.20462,
      ounces: 35.274,
      stones: 0.157473,
    },
    icon: Scale,
  },
  temperature: {
    units: ["celsius", "fahrenheit", "kelvin"],
    conversions: {
      celsius: 1,
      fahrenheit: 1,
      kelvin: 1,
    },
    icon: Thermometer,
  },
  volume: {
    units: [
      "liters",
      "milliliters",
      "gallons",
      "quarts",
      "pints",
      "cups",
      "fluid-ounces",
    ],
    conversions: {
      liters: 1,
      milliliters: 1000,
      gallons: 0.264172,
      quarts: 1.05669,
      pints: 2.11338,
      cups: 4.22675,
      "fluid-ounces": 33.814,
    },
    icon: Droplets,
  },
  time: {
    units: ["seconds", "minutes", "hours", "days", "weeks", "months", "years"],
    conversions: {
      seconds: 1,
      minutes: 1 / 60,
      hours: 1 / 3600,
      days: 1 / 86400,
      weeks: 1 / 604800,
      months: 1 / 2592000,
      years: 1 / 31536000,
    },
    icon: Clock,
  },
  energy: {
    units: [
      "joules",
      "kilojoules",
      "calories",
      "kilocalories",
      "watthours",
      "kilowatthours",
    ],
    conversions: {
      joules: 1,
      kilojoules: 0.001,
      calories: 0.239006,
      kilocalories: 0.000239006,
      watthours: 0.000277778,
      kilowatthours: 2.77778e-7,
    },
    icon: Zap,
  },
};

export default function ConversionCalculator() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<ConversionHistory[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "length",
      fromUnit: "meters",
      toUnit: "feet",
      value: 1,
    },
  });

  const watchCategory = form.watch("category");
  const watchFromUnit = form.watch("fromUnit");
  const watchToUnit = form.watch("toUnit");
  const watchValue = form.watch("value");

  // Get available units for current category
  const availableUnits = CONVERSION_DATA[watchCategory]?.units || [];

  const convertValue = (data: FormValues): ConversionResult => {
    const { category, fromUnit, toUnit, value } = data;

    if (category === "temperature") {
      return convertTemperature(value, fromUnit, toUnit);
    }

    // For other categories, use conversion factors
    const categoryData = CONVERSION_DATA[category];
    const conversions = categoryData.conversions;

    const fromFactor = conversions[fromUnit as keyof typeof conversions];
    const toFactor = conversions[toUnit as keyof typeof conversions];

    const baseValue = value / fromFactor;
    const convertedValue = baseValue * toFactor;

    // Determine appropriate precision
    const precision =
      Math.abs(convertedValue) < 0.01
        ? 6
        : Math.abs(convertedValue) < 1
        ? 4
        : Math.abs(convertedValue) < 1000
        ? 2
        : 0;

    return {
      convertedValue,
      formula: `${value} ${fromUnit} × (${toFactor}/${fromFactor})`,
      precision,
    };
  };

  const convertTemperature = (
    value: number,
    fromUnit: string,
    toUnit: string
  ): ConversionResult => {
    let convertedValue: number;
    let formula = "";

    // Convert to Celsius first
    let celsius: number;
    switch (fromUnit) {
      case "celsius":
        celsius = value;
        break;
      case "fahrenheit":
        celsius = ((value - 32) * 5) / 9;
        formula = `(${value}°F - 32) × 5/9`;
        break;
      case "kelvin":
        celsius = value - 273.15;
        formula = `${value}K - 273.15`;
        break;
      default:
        celsius = value;
    }

    // Convert from Celsius to target unit
    switch (toUnit) {
      case "celsius":
        convertedValue = celsius;
        break;
      case "fahrenheit":
        convertedValue = (celsius * 9) / 5 + 32;
        formula = formula
          ? `(${formula}) × 9/5 + 32`
          : `(${value}°C × 9/5) + 32`;
        break;
      case "kelvin":
        convertedValue = celsius + 273.15;
        formula = formula ? `${formula} + 273.15` : `${value}°C + 273.15`;
        break;
      default:
        convertedValue = celsius;
    }

    return {
      convertedValue,
      formula,
      precision: 2,
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const calculation = convertValue(data);
    setResult(calculation);

    // Add to history
    const historyItem: ConversionHistory = {
      fromValue: data.value,
      fromUnit: data.fromUnit,
      toValue: calculation.convertedValue,
      toUnit: data.toUnit,
      category: data.category,
      timestamp: new Date(),
    };
    setHistory((prev) => [historyItem, ...prev.slice(0, 5)]);

    setSuggestionLoading(true);
    setSuggestion("");
    try {
      const res = await suggestNextStep({
        calculatorName: "Conversion Calculator",
        inputs: data,
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error("Failed to get AI suggestion:", error);
      setSuggestion(
        "Use common conversion factors for quick mental math. Remember that 1 inch = 2.54 cm, 1 kg = 2.2 lbs, and 1 liter = 0.264 gallons for quick estimates."
      );
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      category: "length",
      fromUnit: "meters",
      toUnit: "feet",
      value: 1,
    });
    setResult(null);
    setSuggestion("");
  };

  const swapUnits = () => {
    const currentFrom = form.getValues("fromUnit");
    const currentTo = form.getValues("toUnit");
    form.setValue("fromUnit", currentTo);
    form.setValue("toUnit", currentFrom);

    // Recalculate if we have a result
    if (result) {
      const currentData = form.getValues();
      const newCalculation = convertValue(currentData);
      setResult(newCalculation);
    }
  };

  const applyQuickConversion = (
    preset: "height" | "weight" | "cooking" | "travel"
  ) => {
    const presets = {
      height: {
        category: "length" as const,
        fromUnit: "feet",
        toUnit: "meters",
        value: 6,
      },
      weight: {
        category: "weight" as const,
        fromUnit: "pounds",
        toUnit: "kilograms",
        value: 150,
      },
      cooking: {
        category: "volume" as const,
        fromUnit: "cups",
        toUnit: "milliliters",
        value: 2,
      },
      travel: {
        category: "length" as const,
        fromUnit: "miles",
        toUnit: "kilometers",
        value: 60,
      },
    };
    form.reset({ ...form.getValues(), ...presets[preset] });
  };

  const CategoryIcon = CONVERSION_DATA[watchCategory]?.icon || Ruler;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel - Forms & Features */}
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Universal Converter</CardTitle>
                </div>
                <CardDescription>
                  Convert between different units of measurement across multiple
                  categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Conversions */}
                <div className="space-y-3">
                  <FormLabel className="text-base">Quick Conversions</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickConversion("height")}
                    >
                      📏 Height
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickConversion("weight")}
                    >
                      ⚖️ Weight
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickConversion("cooking")}
                    >
                      🍳 Cooking
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickConversion("travel")}
                    >
                      🚗 Travel
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset to default units for new category
                            const newUnits =
                              CONVERSION_DATA[
                                value as keyof typeof CONVERSION_DATA
                              ].units;
                            form.setValue("fromUnit", newUnits[0]);
                            form.setValue("toUnit", newUnits[1] || newUnits[0]);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="length">Length</SelectItem>
                            <SelectItem value="weight">Weight/Mass</SelectItem>
                            <SelectItem value="temperature">
                              Temperature
                            </SelectItem>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                            <SelectItem value="energy">Energy</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Value to Convert
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conversion Units */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="fromUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Unit</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Swap Button */}
                  <div className="flex justify-center py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={swapUnits}
                      className="rounded-full"
                    ></Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="toUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Unit</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Common Conversions Preview */}
                <div className="pt-4 border-t">
                  <FormLabel className="text-base">
                    Common{" "}
                    {watchCategory.charAt(0).toUpperCase() +
                      watchCategory.slice(1)}{" "}
                    Conversions
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {getCommonConversions(watchCategory).map((conv, index) => (
                      <div
                        key={index}
                        className="text-center p-2 border rounded-lg text-xs"
                      >
                        <p className="font-medium">1 {conv.from}</p>
                        <p className="text-muted-foreground">
                          = {conv.value} {conv.to}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCalculator}
                >
                  Reset
                </Button>
                <Button type="submit">
                  <Calculator className="mr-2 h-4 w-4" />
                  Convert
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Conversion History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle>Recent Conversions</CardTitle>
              </div>
              <CardDescription>
                Your last {history.length} conversions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">
                          {item.fromValue} {item.fromUnit}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {item.toValue.toFixed(4)} {item.toUnit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - Results */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Conversion Result</CardTitle>
            <CardDescription>
              {watchCategory.charAt(0).toUpperCase() + watchCategory.slice(1)}{" "}
              Conversion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {result ? (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-4 text-lg">
                    <span className="font-semibold">
                      {watchValue} {watchFromUnit}
                    </span>
                    <span className="font-semibold text-primary">
                      {result.convertedValue.toFixed(result.precision)}{" "}
                      {watchToUnit}
                    </span>
                  </div>

                  {/* Conversion Formula */}
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-mono text-center">
                      {result.formula ||
                        `${watchValue} ${watchFromUnit} → ${result.convertedValue.toFixed(
                          result.precision
                        )} ${watchToUnit}`}
                    </p>
                  </div>
                </div>

                {/* Additional Conversions */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm">Quick Multipliers</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 border rounded">
                      <p className="text-muted-foreground">×2</p>
                      <p className="font-semibold">
                        {(result.convertedValue * 2).toFixed(result.precision)}
                      </p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <p className="text-muted-foreground">×5</p>
                      <p className="font-semibold">
                        {(result.convertedValue * 5).toFixed(result.precision)}
                      </p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <p className="text-muted-foreground">×10</p>
                      <p className="font-semibold">
                        {(result.convertedValue * 10).toFixed(result.precision)}
                      </p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <p className="text-muted-foreground">÷2</p>
                      <p className="font-semibold">
                        {(result.convertedValue / 2).toFixed(result.precision)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Category-specific tips */}
                {watchCategory === "temperature" && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                      💡 <strong>Quick tip:</strong> °F to °C: Subtract 32, then
                      multiply by 5/9
                    </p>
                  </div>
                )}
                {watchCategory === "length" && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                      📏 <strong>Remember:</strong> 1 inch = 2.54 cm, 1 foot =
                      0.3048 m
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <CategoryIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-muted-foreground mb-2">
                    Enter values to see
                  </p>
                  <p className="font-semibold">Conversion Result</p>
                </div>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-4 flex flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Conversion Tip</CardTitle>
                </CardHeader>
                <CardDescription className="text-left">
                  {suggestionLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    suggestion
                  )}
                </CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Panel - Education */}
      <div className="lg:col-span-3">
        <Tabs defaultValue="systems" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="systems" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Measurement Systems
            </TabsTrigger>
            <TabsTrigger value="formulas" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Key Formulas
            </TabsTrigger>
            <TabsTrigger value="tips" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Quick Tips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="systems" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Measurement Systems</h4>
                    <p className="text-sm text-muted-foreground">
                      The world primarily uses two measurement systems: Metric
                      (International System of Units) and Imperial (US Customary
                      Units). Understanding both is essential for global
                      communication.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Metric System (SI)</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Used by most countries worldwide</li>
                        <li>• Base-10 system for easy conversions</li>
                        <li>• Standard units: meter, kilogram, liter</li>
                        <li>
                          • Prefixes: kilo- (1000), centi- (0.01), milli-
                          (0.001)
                        </li>
                        <li>• Temperature in Celsius or Kelvin</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Imperial System</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Primarily used in the United States</li>
                        <li>
                          • Historical system with varied conversion factors
                        </li>
                        <li>• Common units: feet, pounds, gallons</li>
                        <li>• Temperature in Fahrenheit</li>
                        <li>
                          • Based on historical precedents rather than decimals
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formulas" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">
                      Common Conversion Formulas
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Length:</strong> 1 inch = 2.54 cm, 1 mile =
                          1.609 km
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Weight:</strong> 1 pound = 0.454 kg, 1 ounce =
                          28.35 g
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Volume:</strong> 1 gallon = 3.785 liters, 1
                          cup = 236.6 ml
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Temperature:</strong> °C = (°F - 32) × 5/9, K
                          = °C + 273.15
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Memory Aids</h4>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Km to Miles:</strong> Multiply by 0.6 (roughly
                          3/5)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Kg to Pounds:</strong> Multiply by 2.2
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>Liters to Gallons:</strong> Divide by 4 (rough
                          estimate)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span>
                          <strong>°C to °F:</strong> Double and add 30
                          (approximate)
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">
                      Effective Conversion Strategies
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Mastering unit conversions requires both memorization of
                      key relationships and understanding of practical
                      estimation techniques.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">
                        Estimation Techniques
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Use 2.2 for kg to lbs (actual: 2.20462)</li>
                        <li>• Use 1.6 for miles to km (actual: 1.60934)</li>
                        <li>• Use 0.6 for km to miles (actual: 0.621371)</li>
                        <li>• Use 30 cm per foot (actual: 30.48 cm)</li>
                        <li>• Use 2.5 cm per inch (actual: 2.54 cm)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Practical Applications
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Cooking: Memorize cup to ml conversions</li>
                        <li>• Travel: Know km to miles for speed limits</li>
                        <li>• Weather: Understand °C to °F for temperature</li>
                        <li>• Fitness: Convert lbs to kg for weights</li>
                        <li>• Construction: Switch between feet and meters</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper function for common conversions preview
function getCommonConversions(category: string) {
  const common = {
    length: [
      { from: "inch", to: "cm", value: "2.54" },
      { from: "foot", to: "meters", value: "0.305" },
      { from: "mile", to: "km", value: "1.609" },
      { from: "yard", to: "meters", value: "0.914" },
    ],
    weight: [
      { from: "pound", to: "kg", value: "0.454" },
      { from: "ounce", to: "grams", value: "28.35" },
      { from: "stone", to: "kg", value: "6.35" },
      { from: "kg", to: "pounds", value: "2.205" },
    ],
    temperature: [
      { from: "°C", to: "°F", value: "33.8" },
      { from: "°F", to: "°C", value: "-17.2" },
      { from: "°C", to: "K", value: "274.15" },
      { from: "°F", to: "K", value: "255.9" },
    ],
    volume: [
      { from: "gallon", to: "liters", value: "3.785" },
      { from: "cup", to: "ml", value: "236.6" },
      { from: "pint", to: "ml", value: "473.2" },
      { from: "quart", to: "liters", value: "0.946" },
    ],
    time: [
      { from: "hour", to: "minutes", value: "60" },
      { from: "day", to: "hours", value: "24" },
      { from: "week", to: "days", value: "7" },
      { from: "year", to: "days", value: "365" },
    ],
    energy: [
      { from: "calorie", to: "joules", value: "4.184" },
      { from: "kcal", to: "kj", value: "4.184" },
      { from: "kWh", to: "joules", value: "3.6M" },
      { from: "Wh", to: "joules", value: "3600" },
    ],
  };

  return common[category as keyof typeof common] || common.length;
}
