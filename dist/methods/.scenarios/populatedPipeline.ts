import { db } from '@mindstudio-ai/agent';
import { Articles } from '../src/tables/articles';
import { Topics } from '../src/tables/topics';

export async function populatedPipeline() {
  // --- Articles in various stages ---

  // Published article
  await Articles.push({
    title: 'Why Most AI Projects Fail Before They Start',
    slug: 'why-most-ai-projects-fail',
    subtitle: 'The problem isn\'t the technology. It\'s the question you asked it to answer.',
    excerpt: 'The problem isn\'t the technology. It\'s the question you asked it to answer.',
    body: `## The $50,000 Question Nobody Asked\n\nLast month a client came to me after spending $50,000 on an AI project that went nowhere. Their vendor had built exactly what was specified. The model worked. The pipeline ran. The outputs were technically correct.\n\nThe problem? They automated the wrong process.\n\nThis happens more than anyone wants to admit. Companies rush to "implement AI" without stopping to ask whether the thing they're automating is worth automating in the first place.\n\n## Three Questions Before You Automate Anything\n\nBefore you spend a dollar on AI, answer these:\n\n**1. What decision does this help me make?**\n\nIf you can't name a specific decision, you're building a science project. "We want to use AI for customer service" is not a decision. "We want to route support tickets to the right team in under 30 seconds" is.\n\n**2. What's the cost of getting it wrong?**\n\nSome mistakes are cheap. A recommendation engine that suggests the wrong product costs you a click. A medical diagnosis tool that misses a condition costs a life. The error tolerance shapes everything about how you build.\n\n**3. Who owns the output?**\n\nAI outputs need a human who cares about them. Not a committee. Not "the team." One person who wakes up thinking about whether the system is working. If nobody wants that job, you don't have a use case yet.\n\n## The Real Cost of Skipping This Step\n\nI've watched companies spend 6 months building AI systems that solve problems nobody actually has. The technology worked perfectly. The business case didn't exist.\n\nThe fix is embarrassingly simple: talk to the people who will use the system before you build it. Not their managers. Not the executive sponsor. The actual humans who will look at the output every day.\n\nThey'll tell you in 15 minutes whether your idea is worth building.`,
    status: 'published',
    imageUrl: 'https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/f2a3c650-f893-4c50-9909-625881dcc7a0.png',
    seoKeywords: ['AI projects', 'AI strategy', 'AI implementation', 'business AI'],
    metaDescription: 'Most AI projects fail not because of technology, but because nobody asked the right questions first.',
    ogDescription: 'Most AI projects fail not because of technology, but because nobody asked the right questions first.',
    tags: ['strategy', 'ai-adoption'],
    publishedAt: db.ago(db.days(5)),
    publishedUrl: 'https://systemstudio.msagent.ai/journal/why-most-ai-projects-fail',
    wordCount: 380,
    articleType: 'thought-leadership',
    researchBrief: {
      summary: 'Enterprise AI projects have a failure rate of 60-80% according to multiple industry surveys. The primary causes are organizational, not technical.',
      keyFindings: [
        'Gartner reports that 85% of AI projects fail to deliver on their promises, primarily due to unclear business objectives.',
        'McKinsey found that companies succeeding with AI spend 3x more time on problem definition than model building.',
        'The most common failure mode is automating a process that shouldn\'t exist in the first place.',
      ],
      sources: [
        { url: 'https://www.gartner.com/ai-failure', title: 'Gartner AI Report 2025', relevance: 'Industry-standard failure rate data' },
        { url: 'https://www.mckinsey.com/ai-implementation', title: 'McKinsey AI Implementation Guide', relevance: 'Best practices for problem definition' },
      ],
      quotes: [
        { text: 'The biggest risk in AI is not that the model is wrong, but that you\'re solving the wrong problem.', attribution: 'Andrew Ng, DeepLearning.AI' },
      ],
    },
  });

  // Article in review
  await Articles.push({
    title: 'What to Actually Do With 12 Million Words of Proprietary Data',
    slug: 'what-to-do-with-proprietary-data',
    excerpt: 'RAG is not a strategy. Here\'s what actually works when you\'re sitting on a mountain of content.',
    body: `## The Data Hoarder's Dilemma\n\nA client of mine has 12 million words of proprietary content. Transcripts, blog posts, course materials, email sequences, sales scripts. Fifteen years of one person's expertise, scattered across drives and platforms.\n\nThe knee-jerk response: "Let's build a RAG system!" And sure, you could. You'd have a chatbot that regurgitates chunks of existing content. Congratulations, you've built a very expensive search engine.\n\n## RAG Is a Retrieval Pattern, Not a Strategy\n\nHere's what I tell every client who comes to me with "we have all this data, what do we do with it?"\n\nRAG (Retrieval Augmented Generation) is a technique. It's like saying "we should use a screwdriver." Great. But what are you building?\n\nThe real questions are:\n- What does your audience need that only this data can provide?\n- What format delivers the most value?\n- How fresh does the output need to be?\n\n## Three Approaches That Actually Work\n\n### 1. Fine-Tuned Voice Models\n\nTake the best 10% of the content and use it to fine-tune a model that writes in the creator's voice. Not retrieval, reproduction. The output isn't "content about topic X from the knowledge base." It's "new content that sounds exactly like the original creator wrote it."\n\nCost: $500-2,000 for fine-tuning. Ongoing: near zero.\n\n### 2. Structured Knowledge Extraction\n\nDon't treat the data as a blob. Parse it into structured entities: frameworks, case studies, opinions on specific topics, recurring advice patterns. Build a graph, not a vector store.\n\nThis is harder than RAG but produces dramatically better results because you can generate novel combinations the original author never explicitly made.\n\n### 3. Agentic Content Pipelines\n\nThe most interesting option: build an agent that uses the proprietary data as context while actively researching current developments. The agent doesn't just retrieve, it synthesizes. Old expertise plus new information produces genuinely original analysis.`,
    status: 'review',
    imageUrl: 'https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/0bbdddc7-2a9f-4822-8407-684ba39110ab.png',
    seoKeywords: ['proprietary data', 'RAG', 'fine-tuning', 'knowledge management'],
    metaDescription: 'RAG is not a strategy. Here are three approaches that actually work for proprietary data.',
    ogDescription: 'RAG is not a strategy. Here are three approaches that actually work for proprietary data.',
    tags: ['strategy', 'tools'],
    wordCount: 350,
    articleType: 'thought-leadership',
    researchBrief: {
      summary: 'The shift from simple RAG to more sophisticated approaches (agentic retrieval, fine-tuning, structured knowledge graphs) is accelerating in 2025-2026.',
      keyFindings: [
        'LlamaIndex has pivoted from "RAG framework" to "agentic document processing" reflecting the industry shift.',
        'Fine-tuning costs have dropped 90% in the last 18 months, making voice-matched models accessible to small businesses.',
        'Graph RAG and structured knowledge extraction are emerging as superior alternatives for large proprietary datasets.',
      ],
      sources: [
        { url: 'https://www.llamaindex.ai/blog', title: 'LlamaIndex Blog', relevance: 'Primary source on agentic retrieval evolution' },
        { url: 'https://github.com/NirDiamant/rag_techniques', title: 'RAG Techniques Repo', relevance: '27k+ stars, comprehensive advanced RAG techniques' },
      ],
      quotes: [
        { text: 'RAG is dead. Long live agentic retrieval.', attribution: 'Jerry Liu, LlamaIndex' },
      ],
    },
  });

  // Article in drafting
  await Articles.push({
    title: 'Building an Agentic Workflow That Actually Ships',
    status: 'drafting',
    wordCount: 0,
    articleType: 'educational',
    researchBrief: {
      summary: 'Agentic AI frameworks are maturing rapidly but most teams are building demos, not production systems.',
      keyFindings: [
        'LangGraph and CrewAI dominate the framework space but have very different design philosophies.',
        'The biggest gap is observability: teams can\'t debug agent failures when they happen in production.',
        'n8n has emerged as a dark horse with 160k+ GitHub stars for visual agent workflow building.',
      ],
      sources: [
        { url: 'https://www.langchain.com/langgraph', title: 'LangGraph Documentation', relevance: 'Industry standard for stateful agent graphs' },
      ],
      quotes: [],
    },
  });

  // Article in researching
  await Articles.push({
    title: 'The Hidden Cost of AI Agent Frameworks',
    status: 'researching',
    articleType: 'commentary',
  });

  // Another published article
  await Articles.push({
    title: 'Three Questions to Ask Before You Automate Anything',
    slug: 'three-questions-before-automation',
    excerpt: 'Not every process deserves an AI. Here\'s how to tell which ones do.',
    body: `## Stop Automating Everything\n\nI get it. AI is exciting. You see a repetitive task and your brain immediately goes to "we should automate that."\n\nSlow down.\n\nNot every process deserves automation. Some processes are repetitive because they require human judgment that you haven't noticed yet. Some are repetitive because they shouldn't exist at all.\n\n## The Three Questions\n\n### Question 1: Is this process stable?\n\nIf the process changes every quarter, automating it is a maintenance nightmare. You'll spend more time updating the automation than you save by running it.\n\n### Question 2: What's the volume?\n\nAutomating something you do twice a month is almost never worth it. Automating something you do 200 times a day almost always is. The math isn't complicated.\n\n### Question 3: What happens when it breaks?\n\nBecause it will break. Every automation fails eventually. If the failure mode is "someone gets the wrong email," that's recoverable. If the failure mode is "we ship the wrong product to 10,000 customers," maybe keep a human in the loop.`,
    status: 'published',
    tags: ['strategy', 'ai-adoption'],
    publishedAt: db.ago(db.days(12)),
    publishedUrl: 'https://systemstudio.msagent.ai/journal/three-questions-before-automation',
    wordCount: 210,
    articleType: 'thought-leadership',
  });

  // --- Topics in backlog ---

  await Topics.push([
    {
      title: 'The Real State of AI Agent Observability in 2026',
      description: 'Nobody can debug their agents in production. What tools exist, what\'s missing, and what I\'d recommend to clients.',
      sourceUrls: ['https://www.langchain.com/langgraph', 'https://github.com/NirDiamant/rag_techniques'],
      priority: 'high',
      status: 'backlog',
      suggestedBy: 'agent',
      reasoning: 'Observability is the #1 complaint from teams building production agentic systems. Cole Medin and David Shapiro have both done recent deep dives. This is a gap in your published content.',
    },
    {
      title: 'Fine-Tuning vs RAG: The Numbers Nobody Shares',
      description: 'Actual cost comparisons, latency benchmarks, and quality measurements between fine-tuning and RAG for proprietary data.',
      sourceUrls: [],
      priority: 'high',
      status: 'backlog',
      suggestedBy: 'manual',
    },
    {
      title: 'What Andrew Ng Gets Wrong About Agentic Workflows',
      description: 'His framework is great for education but misses the messy reality of production deployment.',
      sourceUrls: ['https://learn.deeplearning.ai/courses/agentic-ai'],
      priority: 'normal',
      status: 'backlog',
      suggestedBy: 'agent',
      reasoning: 'Andrew Ng\'s agentic AI course is the most-referenced resource but oversimplifies the production challenges. A contrarian take would stand out and spark discussion.',
    },
    {
      title: 'n8n: The Dark Horse of AI Workflow Automation',
      description: 'Visual workflow builder with 160k+ GitHub stars. Why it\'s winning with non-technical teams.',
      sourceUrls: ['https://github.com/n8n-io/n8n'],
      priority: 'normal',
      status: 'backlog',
      suggestedBy: 'agent',
      reasoning: 'Trending rapidly in the AI builder community. Relevant to your audience of business leaders who want to build without deep coding skills.',
    },
    {
      title: 'The Synthetic Data Problem Nobody Talks About',
      description: 'Synthetic data generation tools are everywhere but the quality gap is real.',
      sourceUrls: [],
      priority: 'normal',
      status: 'backlog',
      suggestedBy: 'manual',
    },
  ]);
}
