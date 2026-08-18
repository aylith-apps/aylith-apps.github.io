import { describe, expect, it } from 'vitest';
import type { Project } from '$lib/types/project';
import { rankProjects, tokenize } from './ranking';

const sampleProjects: Project[] = [
	{
		slug: 'stith',
		name: 'Stith',
		tagline: 'Control plane for coding agents',
		description: 'Ingests the full hook stream from every coding agent on your machine.',
		category: 'developer-tools',
		status: 'live',
		iconPath: '',
		gradientFrom: '#3b82f6',
		gradientTo: '#1d4ed8',
		featured: true,
		features: ['Agent monitoring', 'Credential pool', 'Account switching'],
		targetUser: 'Engineers running AI coding agents'
	},
	{
		slug: 'skybot',
		name: 'SkyBot',
		tagline: 'Always-on voice AI assistant',
		description: 'Voice-first AI assistant daemon with local wake-word and faster-whisper.',
		category: 'ai-infrastructure',
		status: 'beta',
		iconPath: '',
		gradientFrom: '#10b981',
		gradientTo: '#059669',
		featured: false,
		features: ['Wake word', 'STT speech to text', 'Cartesia TTS'],
		targetUser: 'Hands-free desktop voice assistant'
	},
	{
		slug: 'tuilith',
		name: 'Tuilith',
		tagline: 'Terminal UI primitives',
		description: 'Modern ratatui TUI component library.',
		category: 'developer-tools',
		status: 'building',
		iconPath: '',
		gradientFrom: '#f59e0b',
		gradientTo: '#d97706',
		featured: false,
		features: ['Terminal widgets', 'Mouse support'],
		targetUser: 'Rust developers'
	}
];

describe('rankProjects', () => {
	it('returns all projects in original order when query is empty', () => {
		const results = rankProjects(sampleProjects, '');
		expect(results.length).toBe(3);
		expect(results[0].project.slug).toBe('stith');
	});

	it('ranks exact name match at the top with highest score', () => {
		const results = rankProjects(sampleProjects, 'skybot');
		expect(results.length).toBe(1);
		expect(results[0].project.slug).toBe('skybot');
		expect(results[0].score).toBeGreaterThanOrEqual(100);
	});

	it('finds projects via natural language intent or keywords', () => {
		const results = rankProjects(sampleProjects, 'voice assistant speech');
		expect(results.length).toBe(1);
		expect(results[0].project.slug).toBe('skybot');
	});

	it('matches across features and categories', () => {
		const results = rankProjects(sampleProjects, 'coding agent');
		expect(results.length).toBe(1);
		expect(results[0].project.slug).toBe('stith');
	});

	it('tokenizes multi-word queries correctly', () => {
		const tokens = tokenize('  AI   voice   agent! ');
		expect(tokens).toEqual(['ai', 'voice', 'agent!']);
	});
});
