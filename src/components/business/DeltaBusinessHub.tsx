'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Zap,
  TrendingDown,
  ShieldCheck,
  Key,
  Webhook,
  FileCode2,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Layers,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Globe,
  DollarSign,
  Receipt,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { businessStore } from '@/lib/business/businessStore';
import { calculateMessageSavings, WHATSAPP_API_RATES } from '@/lib/business/costLedger';
import { renderTemplate } from '@/lib/business/templateEngine';
import { simulateBusinessAiCustomerSupport } from '@/lib/ai/deltaAiEngine';
import { useMessaging } from '@/context/MessagingContext';
import {
  BusinessTemplate,
  BusinessApiKey,
  BusinessCategory,
  WhatsAppCompatibleSendMessageRequest,
} from '@/types/business';

export function DeltaBusinessHub() {
  const { conversations, sendBusinessApiMessage, setActiveConversationId, setActiveTab } = useMessaging();

  // Active view inside Delta Business
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'playground' | 'templates' | 'keys' | 'docs' | 'ai_agents'>('dashboard');

  // Business state from store
  const [profile, setProfile] = useState(businessStore.getProfile());
  const [templates, setTemplates] = useState(businessStore.getTemplates());
  const [apiKeys, setApiKeys] = useState(businessStore.getApiKeys());
  const [webhookConfig, setWebhookConfig] = useState(businessStore.getWebhookConfig());
  const [savingsMetrics, setSavingsMetrics] = useState(businessStore.getCumulativeSavings());
  const [ledger, setLedger] = useState(businessStore.getLedger());

  // Copied state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // AI Agent Studio state
  const [botName, setBotName] = useState('Delta Concierge');
  const [botPersona, setBotPersona] = useState<'friendly' | 'professional' | 'tanglish'>('friendly');
  const [botAutoPilot, setBotAutoPilot] = useState(true);
  const [botWelcomeMsg, setBotWelcomeMsg] = useState('Vanakkam! Welcome to Delta Store. How can I assist you with your orders, returns, or support today?');
  const [knowledgeFaqs, setKnowledgeFaqs] = useState([
    { id: 'faq-1', question: 'What is your delivery timeframe?', answer: 'Orders placed before 2 PM are delivered the same day in Chennai. Standard delivery across South India takes 24-48 hours.' },
    { id: 'faq-2', question: 'How do returns and refunds work?', answer: 'We offer a 7-day no-questions-asked return policy. Refunds are credited to original payment source within 24 hours.' },
    { id: 'faq-3', question: 'Where is your physical store located?', answer: 'Our flagship store is located at T. Nagar, Chennai, open 10 AM to 9 PM daily.' },
  ]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: 'Hello! 👋 I am your automated customer support assistant. Ask me anything about orders, delivery, or returns to test me in real-time ($0 Meta Cloud API fee).', time: 'Just now' }
  ]);
  const [sandboxInput, setSandboxInput] = useState('What is your delivery timeframe?');
  const [isSandboxThinking, setIsSandboxThinking] = useState(false);

  // Playground state
  const [targetContact, setTargetContact] = useState<string>('+919876543210');
  const [selectedMessageType, setSelectedMessageType] = useState<'template' | 'text' | 'interactive' | 'media'>('template');
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('order_dispatched');
  const [templateParam1, setTemplateParam1] = useState<string>('Priya');
  const [templateParam2, setTemplateParam2] = useState<string>('DLT-98421');
  const [templateParam3, setTemplateParam3] = useState<string>('Today by 6:00 PM');
  const [customTextMessage, setCustomTextMessage] = useState<string>('Hello from Delta Business! This message incurred ₹0.00 Meta API fees.');
  const [interactiveButton1, setInteractiveButton1] = useState<string>('Confirm Order');
  const [interactiveButton2, setInteractiveButton2] = useState<string>('Speak with Agent');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);

  // Template Studio state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<BusinessCategory>('UTILITY');
  const [newTemplateHeader, setNewTemplateHeader] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('Hi {{1}}, thank you for choosing Delta Business. Your reference is {{2}}.');
  const [newTemplateFooter, setNewTemplateFooter] = useState('Delta Free Messaging Platform');
  const [newTemplateButtonText, setNewTemplateButtonText] = useState('Track Order');
  const [newTemplateButtonUrl, setNewTemplateButtonUrl] = useState('https://track.delta.io/{{2}}');

  // New API key state
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Webhook test state
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);

  const refreshState = () => {
    setProfile(businessStore.getProfile());
    setTemplates(businessStore.getTemplates());
    setApiKeys(businessStore.getApiKeys());
    setWebhookConfig(businessStore.getWebhookConfig());
    setSavingsMetrics(businessStore.getCumulativeSavings());
    setLedger(businessStore.getLedger());
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // AI Agent Sandbox Handler
  const handleTestSandbox = async () => {
    if (!sandboxInput.trim() || isSandboxThinking) return;
    const userText = sandboxInput.trim();
    setSandboxInput('');
    setSandboxMessages((prev) => [...prev, { sender: 'user', text: userText, time: 'Just now' }]);
    setIsSandboxThinking(true);
    try {
      const res = await simulateBusinessAiCustomerSupport(userText, profile.business_name, knowledgeFaqs);
      setSandboxMessages((prev) => [...prev, { sender: 'bot', text: res.reply, time: 'Just now' }]);
    } catch (e) {
      console.error(e);
      setSandboxMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Thank you for reaching out! Our team has noted your query.', time: 'Just now' },
      ]);
    } finally {
      setIsSandboxThinking(false);
    }
  };

  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      toast.error('Please enter both question and answer for the FAQ');
      return;
    }
    const newFaq = {
      id: `faq-${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
    };
    setKnowledgeFaqs((prev) => [...prev, newFaq]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    toast.success('Added new FAQ to Knowledge Base');
  };

  const handleDeleteFaq = (id: string) => {
    setKnowledgeFaqs((prev) => prev.filter((f) => f.id !== id));
    toast.success('Removed FAQ from Knowledge Base');
  };

  // Dispatch API Message in Playground
  const handleDispatchPlaygroundMessage = async () => {
    setIsDispatching(true);
    setLastApiResponse(null);

    try {
      let payload: WhatsAppCompatibleSendMessageRequest;
      let displayContent = '';
      let interactiveMeta: any = null;

      if (selectedMessageType === 'template') {
        const tmpl = businessStore.getTemplateByName(selectedTemplateName);
        if (!tmpl) {
          toast.error('Selected template not found');
          setIsDispatching(false);
          return;
        }

        const components = [
          {
            type: 'body' as const,
            parameters: [
              { type: 'text' as const, text: templateParam1 },
              { type: 'text' as const, text: templateParam2 },
              { type: 'text' as const, text: templateParam3 },
            ],
          },
        ];

        const rendered = renderTemplate(tmpl, components as any);
        displayContent = rendered.body;
        if (rendered.header) displayContent = `[${rendered.header}]\n\n${displayContent}`;
        if (rendered.footer) displayContent = `${displayContent}\n\n_${rendered.footer}_`;

        interactiveMeta = {
          template: {
            name: tmpl.name,
            category: tmpl.category,
            rendered_header: rendered.header,
            rendered_footer: rendered.footer,
            buttons: rendered.buttons,
          },
        };

        payload = {
          messaging_product: 'delta',
          recipient_type: 'individual',
          to: targetContact,
          type: 'template',
          template: {
            name: tmpl.name,
            language: { code: 'en_US' },
            components,
          },
        };
      } else if (selectedMessageType === 'interactive') {
        displayContent = 'How would you like to proceed with your booking?';
        interactiveMeta = {
          interactive: {
            type: 'button',
            buttons: [
              { id: 'btn_confirm', title: interactiveButton1 },
              { id: 'btn_support', title: interactiveButton2 },
            ],
          },
        };

        payload = {
          messaging_product: 'delta',
          recipient_type: 'individual',
          to: targetContact,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: displayContent },
            action: {
              buttons: [
                { type: 'reply', reply: { id: 'btn_1', title: interactiveButton1 } },
                { type: 'reply', reply: { id: 'btn_2', title: interactiveButton2 } },
              ],
            },
          },
        };
      } else {
        displayContent = customTextMessage;
        payload = {
          messaging_product: 'delta',
          recipient_type: 'individual',
          to: targetContact,
          type: 'text',
          text: { body: customTextMessage },
        };
      }

      // Record zero-cost ledger entry
      const category: BusinessCategory =
        selectedMessageType === 'template'
          ? businessStore.getTemplateByName(selectedTemplateName)?.category || 'UTILITY'
          : 'SERVICE';

      const entry = businessStore.recordLedgerEntry({
        recipient: targetContact,
        category,
        message_type: `${selectedMessageType}${selectedTemplateName ? `:${selectedTemplateName}` : ''}`,
        currency: 'INR',
      });

      // Find an active conversation matching the contact phone or title or fallback
      const cleanTarget = targetContact.replace(/[^0-9]/g, '');
      const targetConv =
        conversations.find((c) =>
          c.id === targetContact ||
          (c.title && c.title.replace(/[^0-9]/g, '').endsWith(cleanTarget.slice(-10)))
        ) || conversations[0];

      if (targetConv) {
        await sendBusinessApiMessage(targetConv.id, {
          content: displayContent,
          type: 'text',
          metadata: interactiveMeta,
        });
      }

      const savings = calculateMessageSavings(category, 'INR');
      const responseData = {
        messaging_product: 'delta_business',
        contacts: [{ input: targetContact, delta_id: `usr_${targetContact.replace(/[^0-9]/g, '')}` }],
        messages: [
          {
            id: `deltamid.HBgM${Date.now()}9a8b7c`,
            message_status: 'delivered',
            pricing: {
              billable: false,
              pricing_model: 'delta_zero_charge',
              category: category.toLowerCase(),
              rate: '0.00',
              currency: 'INR',
              saved_vs_whatsapp: savings.formattedSaved,
              meta_rate_avoided: `₹${savings.whatsappRate.toFixed(4)}`,
            },
          },
        ],
      };

      setLastApiResponse(responseData);
      refreshState();
      toast.success(`Message dispatched at ₹0.00 fee! Saved ${savings.formattedSaved} vs Meta API.`);
    } catch (err: any) {
      toast.error(err.message || 'Error executing API dispatch');
    } finally {
      setIsDispatching(false);
    }
  };

  // Handle template creation
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      toast.error('Please provide a template name and body text.');
      return;
    }

    const created = businessStore.addTemplate({
      name: newTemplateName.toLowerCase().trim().replace(/\s+/g, '_'),
      category: newTemplateCategory,
      language: 'en_US',
      header_type: newTemplateHeader ? 'TEXT' : 'NONE',
      header_content: newTemplateHeader || undefined,
      body_text: newTemplateBody,
      footer_text: newTemplateFooter || undefined,
      buttons: newTemplateButtonText
        ? [
            {
              type: 'URL',
              text: newTemplateButtonText,
              url: newTemplateButtonUrl,
            },
          ]
        : [],
    });

    toast.success(`Template "${created.name}" created and instantly approved!`);
    setNewTemplateName('');
    setNewTemplateHeader('');
    setNewTemplateBody('Hi {{1}}, your notification is ready: {{2}}.');
    refreshState();
  };

  // Handle API key generation
  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const created = businessStore.generateApiKey(newKeyName.trim());
    toast.success(`New API key "${created.name}" generated!`);
    setNewKeyName('');
    setIsCreatingKey(false);
    refreshState();
  };

  // Handle Webhook test ping
  const handleTestWebhookPing = async () => {
    setIsPingingWebhook(true);
    try {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate_test_event' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Webhook delivery verified! Event acknowledged.');
        businessStore.updateWebhookConfig({
          last_delivery_status: 'success',
          last_delivery_at: new Date().toISOString(),
        });
        refreshState();
      } else {
        toast.error('Webhook ping failed');
      }
    } catch (err) {
      toast.error('Could not reach webhook endpoint');
    } finally {
      setIsPingingWebhook(false);
    }
  };

  const selectedTemplateObj = templates.find((t) => t.name === selectedTemplateName) || templates[0];

  return (
    <div className="flex-1 h-full flex flex-col bg-background overflow-y-auto selection:bg-delta-500/20 selection:text-delta-600">
      {/* 1. Header Banner */}
      <header className="border-b border-border/80 bg-card/90 backdrop-blur-xl px-6 py-4 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-delta-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-delta-600/25">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-foreground">
                Delta Business Suite
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                <ShieldCheck className="w-3 h-3" />
                VERIFIED $0 API
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              WhatsApp Cloud API Compatible Engine • Zero Delivery Markup • 100% Free
            </p>
          </div>
        </div>

        {/* Top Metric Strip */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Meta API Fees Avoided
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              ₹{savingsMetrics.totalSavingsINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              <span className="text-xs text-muted-foreground font-semibold">
                (~${savingsMetrics.totalSavingsUSD.toFixed(0)} USD)
              </span>
            </span>
          </div>

          <button
            onClick={() => {
              setActiveTab('chats');
              if (conversations[0]) setActiveConversationId(conversations[0].id);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1.5 border border-border/80 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-delta-600" />
            <span>Open Customer Inbox</span>
          </button>
        </div>
      </header>

      {/* 2. Sub-Navigation Tabs */}
      <div className="border-b border-border/80 bg-muted/30 px-6 py-2 flex items-center gap-2 overflow-x-auto select-none">
        {[
          { id: 'dashboard', label: 'Overview & Ledger', icon: Layers },
          { id: 'playground', label: 'API Playground & Dispatch', icon: Zap },
          { id: 'ai_agents', label: 'AI Agents & RAG Studio', icon: Sparkles },
          { id: 'templates', label: 'Template Studio', icon: FileCode2 },
          { id: 'keys', label: 'API Keys & Webhooks', icon: Key },
          { id: 'docs', label: 'WhatsApp API Specs & SDK', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-card text-foreground shadow-xs border border-border/80 text-delta-600 dark:text-delta-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* ==================== TAB 1: OVERVIEW & LEDGER ==================== */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Dispatches</span>
                  <div className="w-8 h-8 rounded-xl bg-delta-500/10 text-delta-600 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">
                    {savingsMetrics.totalMessages.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    100% delivered with zero drop rate
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Meta API Equivalent</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground line-through opacity-70">
                    ₹{savingsMetrics.metaCostINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">
                    Billed by Meta under PMP model
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between ring-1 ring-emerald-500/30">
                <div className="flex items-center justify-between text-muted-foreground mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Delta Actual Billed
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹0.00
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Zero delivery charge • Forever Free
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-delta-600 to-violet-700 text-white shadow-md shadow-delta-600/20 flex flex-col justify-between">
                <div className="flex items-center justify-between text-white/80 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Net Business Savings</span>
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black">
                    ₹{savingsMetrics.totalSavingsINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-emerald-200 font-semibold mt-1">
                    100% margin retained by business
                  </p>
                </div>
              </div>
            </div>

            {/* Rate Card & Category Breakdown Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Rate Comparison: Meta WhatsApp vs Delta Business
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Per-message cost breakdown by official Meta conversation category
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-delta-500/10 text-delta-600 dark:text-delta-400 text-[10px] font-black">
                    INDIA (INR)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border/70 text-muted-foreground font-bold">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Use Case</th>
                        <th className="py-2.5 px-3">Meta Cloud API Rate</th>
                        <th className="py-2.5 px-3">Delta Business Rate</th>
                        <th className="py-2.5 px-3 text-right">Your Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <tr>
                        <td className="py-3 px-3 font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          Marketing
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">Promotions, offers, product launches</td>
                        <td className="py-3 px-3 font-mono text-rose-500 font-bold">₹0.8631</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-black">₹0.0000</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">100% Free</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          Utility
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">Order tracking, receipts, alerts</td>
                        <td className="py-3 px-3 font-mono text-rose-500 font-bold">₹0.1150</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-black">₹0.0000</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">100% Free</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Authentication
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">One-time passcodes (OTP), verification</td>
                        <td className="py-3 px-3 font-mono text-rose-500 font-bold">₹0.1150</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-black">₹0.0000</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">100% Free</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Service
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">Customer support, replies inside 24h</td>
                        <td className="py-3 px-3 font-mono text-rose-500 font-bold">₹0.1150</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-black">₹0.0000</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">100% Free</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Business Account Details Card */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground">Business Identity</h2>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {profile.id}</span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={profile.avatar_url}
                      alt={profile.business_name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-delta-500/30"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                        {profile.business_name}
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">{profile.phone_number}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {profile.description}
                  </p>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Industry</span>
                      <span className="font-semibold">{profile.vertical}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">Support Email</span>
                      <span className="font-semibold">{profile.email}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Active Templates</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {templates.length} Approved
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveSubTab('playground')}
                  className="mt-4 w-full py-2.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test API in Playground</span>
                </button>
              </div>
            </div>

            {/* Real-time Zero-Cost Ledger Table */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Live Zero-Charge Ledger & Audit Log
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Every message dispatched through Delta API records real-time savings with cryptographic verification
                  </p>
                </div>
                <button
                  onClick={refreshState}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh Ledger"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground font-bold">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Payload Type</th>
                      <th className="py-2.5 px-3">Meta Rate</th>
                      <th className="py-2.5 px-3">Delta Fee</th>
                      <th className="py-2.5 px-3 text-right">Net Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono">
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-foreground">
                          {entry.recipient}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.category === 'MARKETING'
                                ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                                : entry.category === 'UTILITY'
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                : entry.category === 'AUTHENTICATION'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {entry.message_type}
                        </td>
                        <td className="py-2.5 px-3 text-rose-500 font-bold">
                          ₹{entry.meta_whatsapp_rate.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                          ₹{entry.delta_rate.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          +₹{entry.saved_amount.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: API PLAYGROUND & DISPATCH ==================== */}
        {activeSubTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left: Playground Form (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Interactive API Dispatcher</h2>
                  <p className="text-xs text-muted-foreground">
                    Construct and execute live WhatsApp Cloud API payloads at ₹0.00 cost
                  </p>
                </div>

                {/* Recipient Phone */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Recipient Phone Number / Identifier
                  </label>
                  <input
                    type="text"
                    value={targetContact}
                    onChange={(e) => setTargetContact(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-delta-500"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Delivered straight to the recipient’s Delta client via WebSockets.
                  </p>
                </div>

                {/* Message Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Payload Format (WhatsApp Cloud API Specification)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'template', label: 'Template (Variables)' },
                      { id: 'interactive', label: 'Interactive (Buttons)' },
                      { id: 'text', label: 'Direct Text' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedMessageType(type.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          selectedMessageType === type.id
                            ? 'bg-delta-500/10 border-delta-500 text-delta-600 dark:text-delta-400'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields based on Type */}
                {selectedMessageType === 'template' && (
                  <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/70">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Select Approved Template
                      </label>
                      <select
                        value={selectedTemplateName}
                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-delta-500"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                          Placeholder {'{{1}}'}
                        </label>
                        <input
                          type="text"
                          value={templateParam1}
                          onChange={(e) => setTemplateParam1(e.target.value)}
                          placeholder="e.g. Priya"
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                          Placeholder {'{{2}}'}
                        </label>
                        <input
                          type="text"
                          value={templateParam2}
                          onChange={(e) => setTemplateParam2(e.target.value)}
                          placeholder="e.g. DLT-98421"
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                          Placeholder {'{{3}}'}
                        </label>
                        <input
                          type="text"
                          value={templateParam3}
                          onChange={(e) => setTemplateParam3(e.target.value)}
                          placeholder="e.g. 6:00 PM"
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedMessageType === 'interactive' && (
                  <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/70">
                    <p className="text-xs font-bold text-foreground">
                      Interactive Quick Reply Buttons (2 Action Buttons)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                          Button 1 Title
                        </label>
                        <input
                          type="text"
                          value={interactiveButton1}
                          onChange={(e) => setInteractiveButton1(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                          Button 2 Title
                        </label>
                        <input
                          type="text"
                          value={interactiveButton2}
                          onChange={(e) => setInteractiveButton2(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedMessageType === 'text' && (
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Free-Form Text Body
                    </label>
                    <textarea
                      rows={3}
                      value={customTextMessage}
                      onChange={(e) => setCustomTextMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-delta-500"
                    />
                  </div>
                )}

                {/* Dispatch Button */}
                <button
                  onClick={handleDispatchPlaygroundMessage}
                  disabled={isDispatching}
                  className="w-full py-3 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md shadow-delta-600/20 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${isDispatching ? 'animate-spin' : ''}`} />
                  <span>
                    {isDispatching ? 'Dispatching over Delta...' : 'Send API Message (₹0.00 Fee)'}
                  </span>
                </button>
              </div>

              {/* API Response Inspector */}
              {lastApiResponse && (
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      HTTP 200 OK — Delivery Confirmed
                    </span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(lastApiResponse, null, 2), 'Response JSON')}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-muted/60 text-[11px] font-mono text-foreground overflow-x-auto border border-border/60">
                    {JSON.stringify(lastApiResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Right: Real-time Device Mockup Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[340px] rounded-[38px] border-4 border-foreground/20 bg-background shadow-2xl overflow-hidden p-3 flex flex-col h-[560px]">
                {/* Phone Speaker Notch */}
                <div className="w-24 h-4 bg-muted/80 rounded-full mx-auto mb-3" />

                {/* Chat Header in Mockup */}
                <div className="px-3 py-2 border-b border-border/80 flex items-center gap-2.5 bg-card rounded-t-2xl">
                  <img
                    src={profile.avatar_url}
                    alt={profile.business_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1 truncate">
                      {profile.business_name}
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Verified Business Account
                    </p>
                  </div>
                </div>

                {/* Mockup Messages Container */}
                <div className="flex-1 p-3 bg-muted/20 overflow-y-auto space-y-3 text-xs">
                  {/* Incoming Business Message Bubble */}
                  <div className="bg-card border border-border/80 rounded-2xl rounded-tl-xs p-3 shadow-xs space-y-2">
                    {selectedMessageType === 'template' && (
                      <>
                        {selectedTemplateObj.header_content && (
                          <p className="text-xs font-extrabold text-foreground border-b border-border/50 pb-1">
                            {selectedTemplateObj.header_content}
                          </p>
                        )}
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {selectedTemplateObj.body_text
                            .replace('{{1}}', templateParam1)
                            .replace('{{2}}', templateParam2)
                            .replace('{{3}}', templateParam3)}
                        </p>
                        {selectedTemplateObj.footer_text && (
                          <p className="text-[10px] text-muted-foreground italic">
                            {selectedTemplateObj.footer_text}
                          </p>
                        )}
                        {selectedTemplateObj.buttons && selectedTemplateObj.buttons.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            {selectedTemplateObj.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                className="w-full py-1.5 px-3 rounded-lg bg-delta-50 dark:bg-delta-950/60 text-delta-600 dark:text-delta-400 text-xs font-bold border border-delta-200 dark:border-delta-800 text-center flex items-center justify-center gap-1.5"
                              >
                                {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                                <span>{btn.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {selectedMessageType === 'interactive' && (
                      <>
                        <p className="text-xs text-foreground leading-relaxed">
                          How would you like to proceed with your booking?
                        </p>
                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <button
                            type="button"
                            className="w-full py-1.5 px-3 rounded-lg bg-delta-50 dark:bg-delta-950/60 text-delta-600 dark:text-delta-400 text-xs font-bold border border-delta-200 dark:border-delta-800 text-center"
                          >
                            {interactiveButton1}
                          </button>
                          <button
                            type="button"
                            className="w-full py-1.5 px-3 rounded-lg bg-delta-50 dark:bg-delta-950/60 text-delta-600 dark:text-delta-400 text-xs font-bold border border-delta-200 dark:border-delta-800 text-center"
                          >
                            {interactiveButton2}
                          </button>
                        </div>
                      </>
                    )}

                    {selectedMessageType === 'text' && (
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {customTextMessage}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹0.00 Fee
                      </span>
                      <span>Now • Delivered</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 border-t border-border/80 text-center text-[10px] text-muted-foreground font-semibold">
                  Live Preview on Mobile Client
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2.5: AI AGENTS & RAG STUDIO ==================== */}
        {activeSubTab === 'ai_agents' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top AI Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-delta-500/15 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/30 shadow-xs">
                  <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-extrabold text-foreground tracking-tight">
                      Delta AI Autonomous Customer Agent & Knowledge Hub
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20">
                      $0.00 Meta Markup
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Deploy 24/7 intelligent customer service bots with FAQ RAG matching. Free tier Google Gemini or sovereign local SLMs with zero cloud fees.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-card border border-border/80 text-foreground">
                  ₹0.00 AI Resolution Fee
                </span>
              </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Agent Persona & Knowledge FAQs (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Bot Profile Card */}
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-500" />
                    Agent Persona & Configuration
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Agent Display Name
                      </label>
                      <input
                        type="text"
                        value={botName}
                        onChange={(e) => setBotName(e.target.value)}
                        className="w-full bg-muted/60 text-foreground text-xs px-3 py-2 rounded-xl border border-border/80 focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Tone & Dialect
                      </label>
                      <select
                        value={botPersona}
                        onChange={(e) => setBotPersona(e.target.value as any)}
                        className="w-full bg-muted/60 text-foreground text-xs px-3 py-2 rounded-xl border border-border/80 focus:border-violet-500 focus:outline-none"
                      >
                        <option value="friendly">Warm & Friendly (General Retail)</option>
                        <option value="professional">Corporate & Formal (Enterprise B2B)</option>
                        <option value="tanglish">Authentic Tanglish Slang (Regional Outreach)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Initial Greeting & Welcome Message
                    </label>
                    <textarea
                      rows={2}
                      value={botWelcomeMsg}
                      onChange={(e) => setBotWelcomeMsg(e.target.value)}
                      className="w-full bg-muted/60 text-foreground text-xs px-3 py-2 rounded-xl border border-border/80 focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <p className="text-xs font-bold text-foreground">Autonomous Auto-Pilot</p>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically reply to incoming customer WhatsApp/Delta messages using Knowledge Base
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBotAutoPilot(!botAutoPilot)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        botAutoPilot ? 'bg-violet-600' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          botAutoPilot ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Knowledge Base FAQs (RAG) */}
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-emerald-500" />
                        Knowledge Base FAQs (Instant RAG)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        The AI bot searches these business policies before generating answers.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {knowledgeFaqs.length} FAQs Loaded
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {knowledgeFaqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">Q: {faq.question}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            A: {faq.answer}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFaq(faq.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New FAQ Form */}
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-dashed border-border/80 space-y-2.5">
                    <p className="text-xs font-bold text-foreground">+ Add New Policy / FAQ</p>
                    <input
                      type="text"
                      placeholder="Question (e.g. Do you ship to Bangalore?)"
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      className="w-full bg-card text-foreground text-xs px-3 py-2 rounded-xl border border-border/80 focus:border-violet-500 focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      placeholder="Answer (e.g. Yes! We offer standard 24hr delivery to all Bangalore pin codes.)"
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                      className="w-full bg-card text-foreground text-xs px-3 py-2 rounded-xl border border-border/80 focus:border-violet-500 focus:outline-none resize-none"
                    />
                    <button
                      onClick={handleAddFaq}
                      className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Save FAQ to Knowledge Base
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Bot Live Test Simulator (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col h-[580px]">
                  <div className="flex items-center justify-between pb-3 border-b border-border/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-600 flex items-center justify-center font-bold text-xs">
                        🤖
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{botName} Simulator</h4>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Sandbox Mode
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">$0.00 / query</span>
                  </div>

                  {/* Sandbox Messages Stream */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                    {sandboxMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-delta-600 text-white rounded-br-xs'
                              : 'bg-muted/70 text-foreground border border-border/60 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground px-1 mt-0.5 font-mono">
                          {msg.time}
                        </span>
                      </div>
                    ))}

                    {isSandboxThinking && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic px-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0.4s]" />
                        <span className="text-[11px] ml-1">{botName} is matching knowledge FAQs...</span>
                      </div>
                    )}
                  </div>

                  {/* Preset Test Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-t border-border/60">
                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">Test:</span>
                    {[
                      'Delivery timeframe?',
                      'How to return an item?',
                      'Where is your store?',
                      'Track order #DLT-98421',
                    ].map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => setSandboxInput(chip)}
                        className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Sandbox Input Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/80">
                    <input
                      type="text"
                      placeholder="Ask the bot anything..."
                      value={sandboxInput}
                      onChange={(e) => setSandboxInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTestSandbox()}
                      className="flex-1 bg-muted/60 text-foreground text-xs px-3 py-2 rounded-xl border border-border/80 focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      onClick={handleTestSandbox}
                      disabled={isSandboxThinking || !sandboxInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: TEMPLATE STUDIO ==================== */}
        {activeSubTab === 'templates' && (
          <div className="space-y-6 animate-fade-in">
            {/* Create Template Form */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Create WhatsApp-Compatible Template</h2>
                <p className="text-xs text-muted-foreground">
                  Templates created on Delta Business receive instant auto-approval with zero review wait times
                </p>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Template Name (lowercase with underscores)
                    </label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. appointment_reminder"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-semibold"
                    >
                      <option value="UTILITY">UTILITY (Transactional alerts & tracking)</option>
                      <option value="MARKETING">MARKETING (Offers, campaigns, announcements)</option>
                      <option value="AUTHENTICATION">AUTHENTICATION (One-Time Passwords / OTPs)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Header Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTemplateHeader}
                    onChange={(e) => setNewTemplateHeader(e.target.value)}
                    placeholder="e.g. 🗓️ Upcoming Appointment Confirmed"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Body Text with Placeholders {'{{1}}'}, {'{{2}}'}
                  </label>
                  <textarea
                    rows={3}
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    placeholder="Hi {{1}}, your booking is confirmed for {{2}}."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Footer Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={newTemplateFooter}
                      onChange={(e) => setNewTemplateFooter(e.target.value)}
                      placeholder="e.g. Delta Care Team"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Action Button Text
                    </label>
                    <input
                      type="text"
                      value={newTemplateButtonText}
                      onChange={(e) => setNewTemplateButtonText(e.target.value)}
                      placeholder="e.g. View Booking"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Action Button URL
                    </label>
                    <input
                      type="text"
                      value={newTemplateButtonUrl}
                      onChange={(e) => setNewTemplateButtonUrl(e.target.value)}
                      placeholder="https://example.com/order/{{1}}"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-98 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register & Auto-Approve Template</span>
                </button>
              </form>
            </div>

            {/* List of Registered Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {tmpl.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tmpl.category === 'MARKETING'
                              ? 'bg-violet-500/15 text-violet-600'
                              : tmpl.category === 'UTILITY'
                              ? 'bg-sky-500/15 text-sky-600'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {tmpl.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> APPROVED
                        </span>
                      </div>
                    </div>

                    {tmpl.header_content && (
                      <p className="text-xs font-bold text-foreground mb-1">{tmpl.header_content}</p>
                    )}
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {tmpl.body_text}
                    </p>
                    {tmpl.footer_text && (
                      <p className="text-[11px] text-muted-foreground italic mt-2">
                        {tmpl.footer_text}
                      </p>
                    )}
                  </div>

                  {tmpl.buttons && tmpl.buttons.length > 0 && (
                    <div className="pt-2 border-t border-border/60 flex flex-wrap gap-2">
                      {tmpl.buttons.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold"
                        >
                          {b.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: API KEYS & WEBHOOKS ==================== */}
        {activeSubTab === 'keys' && (
          <div className="space-y-6 animate-fade-in">
            {/* API Keys Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Secret API Keys</h2>
                  <p className="text-xs text-muted-foreground">
                    Authenticate outbound calls to /api/v1/messages using Bearer tokens
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingKey(!isCreatingKey)}
                  className="px-3 py-1.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate New Key</span>
                </button>
              </div>

              {isCreatingKey && (
                <form
                  onSubmit={handleGenerateKey}
                  className="p-4 rounded-xl bg-muted/40 border border-border flex items-center gap-3 animate-fade-in"
                >
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key Identifier (e.g. Staging CRM Server)"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-delta-600 text-white font-bold text-xs"
                  >
                    Create
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground font-bold">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Token</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-foreground">{key.name}</td>
                        <td className="py-3 px-3 font-mono text-xs text-muted-foreground flex items-center gap-2">
                          <span>{key.hint}</span>
                          <button
                            onClick={() => copyToClipboard(key.key, 'API Key')}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Copy full key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              businessStore.revokeApiKey(key.id);
                              refreshState();
                              toast.success('API key revoked');
                            }}
                            className="p-1 rounded text-destructive hover:bg-destructive/10"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Webhook Configuration Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Webhook Subscriptions</h2>
                  <p className="text-xs text-muted-foreground">
                    Receive delivery receipts (`sent`, `delivered`, `read`) and incoming messages
                  </p>
                </div>
                <button
                  onClick={handleTestWebhookPing}
                  disabled={isPingingWebhook}
                  className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Webhook className={`w-3.5 h-3.5 text-delta-600 ${isPingingWebhook ? 'animate-spin' : ''}`} />
                  <span>Send Test Ping</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-foreground mb-1">Webhook Endpoint URL</label>
                  <input
                    type="text"
                    value={webhookConfig.url}
                    onChange={(e) => {
                      const updated = businessStore.updateWebhookConfig({ url: e.target.value });
                      setWebhookConfig(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">Verify Token</label>
                  <input
                    type="text"
                    value={webhookConfig.verify_token}
                    onChange={(e) => {
                      const updated = businessStore.updateWebhookConfig({ verify_token: e.target.value });
                      setWebhookConfig(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-foreground">
                    Webhook Status: Connected & Verified
                  </span>
                </div>
                <span className="text-muted-foreground font-mono text-[11px]">
                  Last delivery:{' '}
                  {webhookConfig.last_delivery_at
                    ? new Date(webhookConfig.last_delivery_at).toLocaleTimeString()
                    : 'Just now'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: WHATSAPP API SPECS & SDK ==================== */}
        {activeSubTab === 'docs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-foreground">
                Drop-in Replacement for WhatsApp Business API
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Delta Business uses the exact same JSON schema and headers as the WhatsApp Cloud API.
                Existing enterprise CRMs, chatbots, and broadcast scripts can switch endpoints to Delta
                with <strong>zero code changes</strong>.
              </p>
            </div>

            {/* Code Snippets */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-delta-600" />
                    cURL (Send Template Notification)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST https://your-delta-domain.com/api/v1/messages \\\n  -H "Authorization: Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "messaging_product": "delta",\n    "to": "+919876543210",\n    "type": "template",\n    "template": {\n      "name": "order_dispatched",\n      "language": { "code": "en_US" },\n      "components": [\n        {\n          "type": "body",\n          "parameters": [\n            { "type": "text", "text": "Priya" },\n            { "type": "text", "text": "ORD-54321" },\n            { "type": "text", "text": "6:00 PM" }\n          ]\n        }\n      ]\n    }\n  }'`,
                        'cURL command'
                      )
                    }
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-muted/60 text-[11px] font-mono text-foreground overflow-x-auto border border-border/60">
{`curl -X POST https://your-delta-domain.com/api/v1/messages \\
  -H "Authorization: Bearer dlt_live_9a2f7c01b4e6d38a529f60bc914e" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messaging_product": "delta",
    "to": "+919876543210",
    "type": "template",
    "template": {
      "name": "order_dispatched",
      "language": { "code": "en_US" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Priya" },
            { "type": "text", "text": "ORD-54321" },
            { "type": "text", "text": "6:00 PM" }
          ]
        }
      ]
    }
  }'`}
                </pre>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-600" />
                    Node.js / TypeScript SDK Snippet
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `const response = await fetch('https://your-delta-domain.com/api/v1/messages', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ' + process.env.DELTA_API_KEY,\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    messaging_product: 'delta',\n    to: '+919876543210',\n    type: 'text',\n    text: { body: 'Your verification OTP is 849201' },\n  }),\n});\nconst result = await response.json();\nconsole.log(result.messages[0].pricing.rate); // '0.00'`,
                        'Node.js code'
                      )
                    }
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-muted/60 text-[11px] font-mono text-foreground overflow-x-auto border border-border/60">
{`const response = await fetch('https://your-delta-domain.com/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.DELTA_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messaging_product: 'delta',
    to: '+919876543210',
    type: 'text',
    text: { body: 'Your verification OTP is 849201' },
  }),
});
const result = await response.json();
console.log(result.messages[0].pricing.rate); // '0.00' (₹0.00 Meta Fee)`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
