import 'dotenv/config';
import { db } from './firebase-admin'; 
import { initialCalculators, initialCalculatorData } from './calculators';

async function seedDatabase() {
  console.log('Starting to seed the database...');

  const calculatorsCol = db.collection('calculators');
  const categoriesCol = db.collection('calculator_categories');

  // Check if collections are empty before seeding
  const calculatorsSnapshot = await calculatorsCol.get();
  const categoriesSnapshot = await categoriesCol.get();

  if (!calculatorsSnapshot.empty || !categoriesSnapshot.empty) {
    console.log('Database already contains data. Aborting seed.');
    return;
  }

  // Correct way to start a batch
  const batch = db.batch();

  // Seed categories
  initialCalculatorData.forEach((category) => {
    const categoryRef = categoriesCol.doc(category.slug);
    const { icon, ...rest } = category;

    batch.set(categoryRef, {
      ...rest,
      icon: icon.displayName || 'Calculator',
    });
  });

  console.log(`${initialCalculatorData.length} categories queued for seeding.`);

  // Seed calculators
  initialCalculators.forEach((calculator) => {
    const calcRef = calculatorsCol.doc(calculator.slug);
    const { componentName, iconName, ...rest } = calculator as any;

    batch.set(calcRef, {
      ...rest,
      component: componentName,
      icon: iconName,
    });
  });

  console.log(`${initialCalculators.length} calculators queued for seeding.`);

  try {
    await batch.commit();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase()
  .then(() => {
    console.log('Seed script finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
