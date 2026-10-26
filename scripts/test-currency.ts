import { generateAgreementDocx } from '../src/lib/agreements/docx-generator.ts';
import { generateAgreementPdf } from '../src/lib/agreements/pdf-generator.ts';
import { calculateAgreementFinancials } from '../src/lib/agreements/financials.ts';
import { PaymentCurrency } from '../src/types/agreement.ts';
import * as fs from 'fs';
import path from 'path';

async function testCurrency(currency: PaymentCurrency) {
  const financials = calculateAgreementFinancials({
    paymentCurrency: currency,
    agreedExchangeRate: currency === 'EUR' ? null : 1.2,
    exchangeRateDate: currency === 'EUR' ? undefined : '2023-01-01',
    discountType: 'percentage',
    discountValue: 10,
  });
  const record: any = {
    id: 'test-id',
    referenceNumber: `TEST-${currency}`,
    agreementDate: '2023-01-01',
    consultantEntityName: 'UniMondo Ltd',
    consultantRegNumber: '14829023',
    consultantAddress: 'Tripoli Tower, Suit 22, Block A, Floor 47, Tripoli, Libya',
    studentFullName: 'John Doe',
    studentParentGuardian: 'Jane Doe',
    studentCnicPassport: 'ABC123456',
    studentAddress: '123 Main St',
    studentEmail: 'john@example.com',
    studentPhone: '+123456789',
    degreeLevel: 'Bachelor',
    fieldOfStudy: 'Computer Science',
    preferredDestination: 'USA',
    academicYearIntake: '2024',
    financials,
    repName: 'Rep Name',
    repDesignation: 'Director',
    repDate: '2023-01-01',
    studentSignatureDate: '2023-01-01',
  };
  const docx = await generateAgreementDocx(record);
  const outDir = path.resolve(process.cwd(), 'generated-docs');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${record.referenceNumber}.docx`), docx);
  const pdf = await generateAgreementPdf(record);
  fs.writeFileSync(path.join(outDir, `${record.referenceNumber}.pdf`), pdf);
  console.log(`Generated ${record.referenceNumber}`);
}

async function main() {
  const currencies: PaymentCurrency[] = ['EUR', 'PKR', 'LYD', 'TND', 'TRY', 'USD', 'BDT'];
  for (const cur of currencies) {
    await testCurrency(cur);
  }
}

main().catch(console.error);
