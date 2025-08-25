// Test dengan error handling yang lebih baik
const { runScraper } = require('./services/scraperService');

async function testScraperWithFallback() {
    console.log('Starting test...');
    
    try {
        const results = await runScraper('Marketing', 'US', 'California');
        
        if (results && results.length > 0) {
            console.log('✅ Success! Results:');
            console.log(JSON.stringify(results, null, 2));
        } else {
            console.log('❌ No results returned');
        }
    } catch (error) {
        console.error('Test error:', error);
    }
}

testScraperWithFallback();