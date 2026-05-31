# Jupiter Aggregator Integration

Implementasi lengkap Jupiter V6 API untuk real swap execution di MemeAgent.

## 📁 File Structure

```
src/
├── config/
│   └── jupiter.js              # Jupiter configuration & constants
├── utils/
│   ├── jupiterSwap.js          # Core Jupiter integration functions
│   └── tradingExecutor.js      # Updated dengan Jupiter integration
└── examples/
    └── jupiterSwapExample.js   # Usage examples & demos
```

## 🚀 Features

- ✅ Jupiter V6 API integration
- ✅ Versioned transactions support
- ✅ Auto priority fee calculation
- ✅ Slippage protection
- ✅ Price impact detection
- ✅ Multi-route optimization
- ✅ Retry logic untuk failed transactions
- ✅ Comprehensive error handling
- ✅ SOL ↔ Token swaps (both directions)

## 📦 Core Functions

### 1. fetchQuote()

Mendapatkan best price quote dari Jupiter Aggregator.

```javascript
import { fetchQuote, solToLamports } from './utils/jupiterSwap.js';
import { NATIVE_SOL_MINT } from './config/jupiter.js';

const quote = await fetchQuote(
  NATIVE_SOL_MINT,                    // Input mint (SOL)
  'TokenMintAddressHere',             // Output mint (Token)
  solToLamports(0.1),                 // Amount (0.1 SOL in lamports)
  {
    slippageBps: 100,                 // 1% slippage
    onlyDirectRoutes: false           // Allow multi-hop routes
  }
);

if (quote.success) {
  console.log('Output:', quote.outputAmount);
  console.log('Price Impact:', quote.priceImpactPct);
  console.log('Routes:', quote.routeInfo.numberOfRoutes);
}
```

### 2. simulateSwap()

Simulate swap sebelum execution untuk validasi.

```javascript
import { simulateSwap } from './utils/jupiterSwap.js';

const simulation = await simulateSwap(
  connection,
  wallet,
  NATIVE_SOL_MINT,
  'TokenMintAddressHere',
  solToLamports(0.1),
  {
    slippageBps: 100,
    maxPriceImpact: 5  // Max 5% price impact
  }
);

if (simulation.success) {
  console.log('Safe to execute:', simulation.priceImpactLevel);
}
```

### 3. buildSwapTransaction()

Build swap transaction dengan Jupiter API.

```javascript
import { buildSwapTransaction } from './utils/jupiterSwap.js';

const txData = await buildSwapTransaction(
  connection,
  wallet,
  quoteResponse,
  {
    wrapUnwrapSOL: true,
    autoSetPriorityFee: true
  }
);

if (txData.success) {
  console.log('Transaction ready:', txData.transaction);
}
```

### 4. executeSwap()

Execute swap dengan retry logic.

```javascript
import { executeSwap } from './utils/jupiterSwap.js';

const result = await executeSwap(
  connection,
  wallet,
  transactionData,
  {
    maxRetries: 3,
    retryDelay: 2000
  }
);

if (result.success) {
  console.log('Swap successful:', result.signature);
}
```

## 🎯 TradingExecutor Integration

### Execute Buy Order (SOL → Token)

```javascript
import { TradingExecutor } from './utils/tradingExecutor.js';

const executor = new TradingExecutor(connection, wallet);

const signal = {
  ca: 'TokenMintAddress',
  symbol: 'TOKEN',
  priceUsd: 0.001,
  grade: 'A+',
  confidence: 85
};

const result = await executor.executeBuy(signal, 0.1, {
  slippageBps: 100,
  autoSetPriorityFee: true,
  maxRetries: 3
});

if (result.success) {
  console.log('Buy successful!');
  console.log('Signature:', result.signature);
  console.log('Output:', result.estimatedOutput);
  console.log('Price Impact:', result.priceImpact);
}
```

### Execute Sell Order (Token → SOL)

```javascript
const trade = {
  ca: 'TokenMintAddress',
  symbol: 'TOKEN',
  entryPrice: 0.001,
  amount: 1000000,
  status: 'ACTIVE'
};

const result = await executor.executeSell(trade, 100); // Sell 100%

if (result.success) {
  console.log('Sell successful!');
  console.log('Signature:', result.signature);
  console.log('SOL Received:', result.estimatedSOLReceived);
}
```

## ⚙️ Configuration

### Default Settings (jupiter.js)

```javascript
{
  slippageBps: 100,              // 1% slippage
  maxSlippageBps: 500,           // 5% max
  minSlippageBps: 50,            // 0.5% min
  priorityFeeLamports: 0,        // Auto
  autoSetPriorityFee: true,
  useVersionedTransactions: true,
  maxAccounts: 64,
  onlyDirectRoutes: false,
  wrapUnwrapSOL: true
}
```

### Transaction Settings

```javascript
{
  maxRetries: 3,
  retryDelay: 2000,              // 2 seconds
  confirmationTimeout: 30000,    // 30 seconds
  commitment: 'confirmed',
  skipPreflight: false
}
```

### Price Impact Thresholds

```javascript
{
  LOW: 1,      // < 1% - Safe
  MEDIUM: 3,   // 1-3% - Caution
  HIGH: 5,     // 3-5% - Warning
  EXTREME: 10  // > 5% - Danger
}
```

## 🛡️ Error Handling

### Common Error Cases

```javascript
// 1. No routes available
if (!quote.success && quote.error.includes('No routes')) {
  console.log('Token tidak memiliki liquidity');
}

// 2. High price impact
if (simulation.priceImpactPct > 5) {
  console.warn('Price impact terlalu tinggi!');
}

// 3. Insufficient balance
if (result.error.includes('Balance tidak cukup')) {
  console.log('Top up wallet terlebih dahulu');
}

// 4. Transaction failed
if (!result.success) {
  console.error('Transaction failed:', result.error);
  // Retry atau notify user
}
```

### Error Messages

```javascript
ERROR_MESSAGES = {
  NO_ROUTES: 'Tidak ada route tersedia untuk swap ini',
  INSUFFICIENT_LIQUIDITY: 'Likuiditas tidak cukup',
  SLIPPAGE_EXCEEDED: 'Slippage melebihi batas maksimum',
  PRICE_IMPACT_HIGH: 'Price impact terlalu tinggi',
  TRANSACTION_FAILED: 'Transaksi gagal',
  QUOTE_EXPIRED: 'Quote sudah expired, refresh quote',
  INVALID_TOKEN: 'Token address tidak valid',
  NETWORK_ERROR: 'Network error, coba lagi'
}
```

## 🔧 Advanced Usage

### Dynamic Slippage

```javascript
import { calculateDynamicSlippage } from './config/jupiter.js';

const baseSlippage = 100; // 1%
const priceImpact = 2.5;  // 2.5%
const volatility = 1.8;   // High volatility

const dynamicSlippage = calculateDynamicSlippage(
  baseSlippage,
  priceImpact,
  volatility
);

console.log('Adjusted slippage:', dynamicSlippage / 100, '%');
```

### Custom Priority Fee

```javascript
const result = await executor.executeBuy(signal, 0.1, {
  autoSetPriorityFee: false,
  priorityFeeLamports: 10000  // 0.00001 SOL
});
```

### Direct Routes Only (Faster)

```javascript
const quote = await fetchQuote(inputMint, outputMint, amount, {
  onlyDirectRoutes: true  // Skip multi-hop routes
});
```

### Platform Fee (Referral)

```javascript
const txData = await buildSwapTransaction(
  connection,
  wallet,
  quoteResponse,
  {
    feeAccount: 'YourFeeAccountPublicKey',
    platformFeeBps: 20  // 0.2% fee
  }
);
```

## 📊 Response Objects

### Quote Response

```javascript
{
  success: true,
  quote: { /* Jupiter quote data */ },
  inputAmount: 100000000,        // lamports
  outputAmount: 1234567890,      // token units
  priceImpactPct: 0.5,          // 0.5%
  priceImpactLevel: 'safe',     // safe|low|medium|high|extreme
  routeInfo: {
    numberOfRoutes: 2,
    marketInfos: [...],
    totalFeeAmount: 5000
  },
  slippageBps: 100,
  timestamp: 1234567890
}
```

### Execution Result

```javascript
{
  success: true,
  signature: 'TransactionSignature...',
  confirmation: { /* Confirmation data */ },
  signal: { /* Original signal */ },
  amountSol: 0.1,
  executedPrice: 0.001234,
  estimatedOutput: 81000,
  priceImpact: 0.5,
  priceImpactLevel: 'safe',
  slippage: 1,
  routeInfo: { /* Route details */ },
  timestamp: 1234567890
}
```

## 🧪 Testing

Run example file untuk testing:

```bash
node src/examples/jupiterSwapExample.js
```

Atau import individual examples:

```javascript
import {
  exampleFetchQuote,
  exampleSimulateSwap,
  exampleExecuteBuy
} from './examples/jupiterSwapExample.js';

await exampleFetchQuote();
```

## 🔐 Security Best Practices

1. **Always simulate before execute**
   ```javascript
   const sim = await simulateSwap(...);
   if (sim.success && sim.priceImpactLevel !== 'extreme') {
     await executeSwap(...);
   }
   ```

2. **Set reasonable slippage limits**
   ```javascript
   const slippage = Math.min(userSlippage, 500); // Max 5%
   ```

3. **Check price impact**
   ```javascript
   if (quote.priceImpactPct > 5) {
     // Warn user or reject
   }
   ```

4. **Validate token addresses**
   ```javascript
   try {
     new PublicKey(tokenMint);
   } catch {
     throw new Error('Invalid token address');
   }
   ```

5. **Handle retries properly**
   ```javascript
   const result = await executeSwap(connection, wallet, txData, {
     maxRetries: 3,
     retryDelay: 2000
   });
   ```

## 📝 Notes

- Jupiter V6 API tidak memerlukan API key
- Versioned transactions lebih efisien (recommended)
- Auto priority fee menggunakan Jupiter's smart calculation
- Quote valid selama ~30 detik, refresh jika expired
- Multi-hop routes memberikan better prices tapi lebih lambat
- Direct routes lebih cepat tapi mungkin tidak optimal

## 🐛 Troubleshooting

### Issue: "No routes available"
**Solution:** Token mungkin tidak memiliki liquidity atau pair tidak tersedia.

### Issue: "Transaction failed"
**Solution:** Check balance, slippage settings, dan network status. Retry dengan higher priority fee.

### Issue: "Price impact too high"
**Solution:** Reduce trade amount atau increase slippage tolerance.

### Issue: "Quote expired"
**Solution:** Fetch new quote sebelum execute.

### Issue: "Insufficient liquidity"
**Solution:** Reduce trade amount atau split into multiple smaller trades.

## 🔗 Resources

- [Jupiter V6 API Docs](https://station.jup.ag/docs/apis/swap-api)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Jupiter Aggregator](https://jup.ag/)

## 📄 License

MIT License - MemeAgent Project
