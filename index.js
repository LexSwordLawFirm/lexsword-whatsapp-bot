const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment');
const express = require('express');

// সার্ভার যেন ক্র্যাশ না করে তাই একটি ডামি পোর্ট চালু করা
const app = express();
app.get('/', (req, res) => res.send('LexSword WhatsApp Bot is Alive!'));
app.listen(process.env.PORT || 3000, () => console.log('Web server is running.'));

// আপনার Supabase এর URL এবং KEY এখানে বসান (অবশ্যই সঠিকটা দেবেন)
const supabaseUrl = 'আপনার_সুপাবেস_ইউআরএল_এখানে_দিন';
const supabaseKey = 'আপনার_সুপাবেস_অ্যানন_কি_এখানে_দিন';
const supabase = createClient(supabaseUrl, supabaseKey);

// WhatsApp Bot তৈরি করা
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // সার্ভারে চালানোর জন্য জরুরি
    }
});

// QR কোড জেনারেট করা
client.on('qr', (qr) => {
    console.log('----------------------------------------------------');
    console.log('অনুগ্রহ করে আপনার হোয়াটসঅ্যাপ দিয়ে নিচের QR কোডটি স্ক্যান করুন:');
    qrcode.generate(qr, { small: true });
    console.log('----------------------------------------------------');
});

client.on('ready', () => {
    console.log('LexSword WhatsApp Bot সফলভাবে কানেক্ট হয়েছে এবং প্রস্তুত!');
});

// প্রতিদিন সন্ধ্যা ৭ টায় (19:00) রিমাইন্ডার পাঠানো
cron.schedule('0 19 * * *', async () => {
    console.log('মামলা চেক করা হচ্ছে...');
    const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');
    const nextWeek = moment().add(7, 'days').format('YYYY-MM-DD');

    const { data: cases, error } = await supabase.from('cases').select('*');
    if (error) { console.error("ডাটাবেস এরর:", error); return; }

    cases.forEach(async (c) => {
        // যদি ফোন নম্বর না থাকে বা ১১ ডিজিটের কম হয়, তবে বাদ দেবে
        if (!c.client_phone || c.client_phone.length < 11) return;

        let number = c.client_phone.trim();
        if (number.startsWith('01')) number = '88' + number;
        const chatId = number + '@c.us';

        let message = '';
        if (c.next_date === tomorrow) {
            message = `সম্মানিত ক্লায়েন্ট, \nরিমাইন্ডার: আগামীকাল ${c.next_date} তারিখে আপনার [${c.case_no}] - ${c.party_name} মামলার দিন ধার্য করা হয়েছে। অনুগ্রহ করে যথাসময়ে কোর্টে উপস্থিত থাকার জন্য অনুরোধ রইল। \n- LexSword Law Firm`;
        } else if (c.next_date === nextWeek) {
            message = `সম্মানিত ক্লায়েন্ট, \nআগামী ${c.next_date} তারিখে আপনার [${c.case_no}] - ${c.party_name} মামলার শুনানির দিন ধার্য করা হয়েছে। প্রয়োজনীয় প্রস্তুতি নেওয়ার জন্য অনুরোধ রইল। \n- LexSword Law Firm`;
        }

        if (message !== '') {
            try {
                await client.sendMessage(chatId, message);
                console.log(`মেসেজ সফলভাবে পাঠানো হয়েছে: ${c.client_phone}`);
            } catch (err) {
                console.error(`মেসেজ পাঠাতে ব্যর্থ (${c.client_phone}):`, err.message);
            }
        }
    });
});

client.initialize();
