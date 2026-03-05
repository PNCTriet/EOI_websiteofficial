# EOI Website Official

This is a [Next.js](https://nextjs.org) project bootstrapped with TypeScript, Tailwind CSS, and ESLint.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

### Trang cảm ơn sản phẩm (NFC)

- **URL:** `/product/thank-you?p=<productId>&sig=<signature>`
- Link được **ký bằng HMAC** (secret trong `EOI_PRODUCT_LINK_SECRET`) nên không thể tự tạo link hợp lệ nếu không có secret — chống giả mạo.
- Copy link vẫn dùng được (một link cho một sản phẩm); mỗi NFC tag nên dùng một `productId` riêng nếu cần phân biệt từng sản phẩm.

**Tạo link để ghi vào NFC:**

1. Copy `.env.example` thành `.env.local` và đặt `EOI_PRODUCT_LINK_SECRET` (tối thiểu 16 ký tự).
2. Chạy script (thay `your-secret`, `product-id`, và base URL nếu cần):
   ```bash
   EOI_PRODUCT_LINK_SECRET="your-secret" node scripts/generate-product-link.mjs "product-id" "https://your-domain.com"
   ```
3. Ghi URL in ra vào NFC tag.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
