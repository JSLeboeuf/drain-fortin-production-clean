import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger.js';

export interface GitHubToolArgs {
  query?: string;
  owner?: string;
  repo?: string;
  language?: string;
  sort?: string;
  order?: string;
  per_page?: number;
  state?: string;
  labels?: string;
  title?: string;
  body?: string;
  assignees?: string[];
  username?: string;
  path?: string;
  ref?: string;
  filename?: string;
}

export class GitHubTools {
  private octokit: Octokit | null = null;

  constructor() {
    this.initializeOctokit();
  }

  private initializeOctokit() {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      this.octokit = new Octokit({ auth: token });
      logger.info('GitHub client initialized with token');
    } else {
      logger.warn('No GitHub token provided - some features will be limited');
    }
  }

  async searchRepositories(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { query, language, sort = 'stars', order = 'desc', per_page = 10 } = args;

      const searchQuery = language ? `${query} language:${language}` : query;

      const response = await this.octokit.search.repos({
        q: searchQuery!,
        sort: sort as any,
        order: order as any,
        per_page: Math.min(per_page, 100)
      });

      const results = response.data.items.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updated_at: repo.updated_at
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.data.total_count} repositories. Showing top ${results.length}:\n\n${results.map(repo =>
            `📦 **${repo.full_name}**\n` +
            `   ⭐ ${repo.stars} | 🍴 ${repo.forks} | 🏷️ ${repo.language || 'N/A'}\n` +
            `   📝 ${repo.description || 'No description'}\n` +
            `   🔗 ${repo.url}\n` +
            `   📅 Updated: ${new Date(repo.updated_at).toLocaleDateString()}\n`
          ).join('\n')}`
        }]
      };
    } catch (error) {
      logger.error('Error searching repositories:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la recherche: ${error.message}` }],
        isError: true
      };
    }
  }

  async getRepository(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { owner, repo } = args;

      const response = await this.octokit.repos.get({
        owner: owner!,
        repo: repo!
      });

      const repository = response.data;

      return {
        content: [{
          type: 'text',
          text: `📦 **${repository.full_name}**\n\n` +
               `📝 **Description:** ${repository.description || 'Aucune description'}\n` +
               `⭐ **Stars:** ${repository.stargazers_count}\n` +
               `🍴 **Forks:** ${repository.forks_count}\n` +
               `👁️ **Watchers:** ${repository.watchers_count}\n` +
               `💻 **Language:** ${repository.language || 'N/A'}\n` +
               `📅 **Créé:** ${new Date(repository.created_at).toLocaleDateString()}\n` +
               `📅 **Dernière mise à jour:** ${new Date(repository.updated_at).toLocaleDateString()}\n` +
               `🔗 **URL:** ${repository.html_url}\n` +
               `📊 **Issues ouvertes:** ${repository.open_issues_count}\n` +
               `🏷️ **Topics:** ${repository.topics?.join(', ') || 'Aucun'}\n` +
               `📄 **License:** ${repository.license?.name || 'Aucune'}`
        }]
      };
    } catch (error) {
      logger.error('Error getting repository:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la récupération du repository: ${error.message}` }],
        isError: true
      };
    }
  }

  async listIssues(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { owner, repo, state = 'open', labels, per_page = 10 } = args;

      const response = await this.octokit.issues.listForRepo({
        owner: owner!,
        repo: repo!,
        state: state as any,
        labels,
        per_page: Math.min(per_page, 100)
      });

      const issues = response.data.map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        user: issue.user?.login,
        labels: issue.labels.map(label => typeof label === 'string' ? label : label.name),
        url: issue.html_url,
        comments: issue.comments
      }));

      return {
        content: [{
          type: 'text',
          text: `📋 **Issues ${state}** pour ${owner}/${repo} (${issues.length} affichées):\n\n${issues.map(issue =>
            `🔹 **#${issue.number}** - ${issue.title}\n` +
            `   👤 ${issue.user} | 📅 ${new Date(issue.created_at).toLocaleDateString()}\n` +
            `   🏷️ ${issue.labels.join(', ') || 'Aucun label'}\n` +
            `   💬 ${issue.comments} commentaires\n` +
            `   🔗 ${issue.url}\n`
          ).join('\n')}`
        }]
      };
    } catch (error) {
      logger.error('Error listing issues:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la récupération des issues: ${error.message}` }],
        isError: true
      };
    }
  }

  async createIssue(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { owner, repo, title, body, labels, assignees } = args;

      const response = await this.octokit.issues.create({
        owner: owner!,
        repo: repo!,
        title: title!,
        body,
        labels: labels || [],
        assignees: assignees || []
      });

      const issue = response.data;

      return {
        content: [{
          type: 'text',
          text: `✅ **Issue créée avec succès !**\n\n` +
               `📋 **#${issue.number}** - ${issue.title}\n` +
               `🔗 ${issue.html_url}\n` +
               `👤 Créée par: ${issue.user.login}\n` +
               `📅 Créée le: ${new Date(issue.created_at).toLocaleString()}\n` +
               `🏷️ Labels: ${issue.labels.map(l => typeof l === 'string' ? l : l.name).join(', ') || 'Aucun'}\n` +
               `👥 Assignés: ${issue.assignees?.map(a => a.login).join(', ') || 'Personne'}`
        }]
      };
    } catch (error) {
      logger.error('Error creating issue:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la création de l'issue: ${error.message}` }],
        isError: true
      };
    }
  }

  async getPullRequests(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { owner, repo, state = 'open', per_page = 10 } = args;

      const response = await this.octokit.pulls.list({
        owner: owner!,
        repo: repo!,
        state: state as any,
        per_page: Math.min(per_page, 100)
      });

      const prs = response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        user: pr.user?.login,
        head: `${pr.head.repo?.full_name}:${pr.head.ref}`,
        base: `${pr.base.repo?.full_name}:${pr.base.ref}`,
        url: pr.html_url,
        merged: pr.merged,
        mergeable: pr.mergeable
      }));

      return {
        content: [{
          type: 'text',
          text: `🔄 **Pull Requests ${state}** pour ${owner}/${repo} (${prs.length} affichées):\n\n${prs.map(pr =>
            `🔹 **#${pr.number}** - ${pr.title}\n` +
            `   👤 ${pr.user} | 📅 ${new Date(pr.created_at).toLocaleDateString()}\n` +
            `   📂 ${pr.head} → ${pr.base}\n` +
            `   ${pr.merged ? '✅ Fusionnée' : pr.mergeable ? '🟢 Fusionnable' : '🔴 Conflits'}\n` +
            `   🔗 ${pr.url}\n`
          ).join('\n')}`
        }]
      };
    } catch (error) {
      logger.error('Error getting pull requests:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la récupération des PR: ${error.message}` }],
        isError: true
      };
    }
  }

  async getUserProfile(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { username } = args;

      const response = await this.octokit.users.getByUsername({
        username: username!
      });

      const user = response.data;

      return {
        content: [{
          type: 'text',
          text: `👤 **Profil GitHub: @${user.login}**\n\n` +
               `📝 **Nom:** ${user.name || 'Non spécifié'}\n` +
               `🏢 **Entreprise:** ${user.company || 'Non spécifiée'}\n` +
               `📍 **Localisation:** ${user.location || 'Non spécifiée'}\n` +
               `📧 **Email:** ${user.email || 'Privé'}\n` +
               `🔗 **Site web:** ${user.blog || 'Aucun'}\n` +
               `📅 **Membre depuis:** ${new Date(user.created_at).toLocaleDateString()}\n` +
               `📊 **Repositories publics:** ${user.public_repos}\n` +
               `👥 **Followers:** ${user.followers} | **Following:** ${user.following}\n` +
               `⭐ **Stars reçues:** ${user.public_gists}\n` +
               `🔗 **Profil:** ${user.html_url}\n` +
               `${user.bio ? `\n📖 **Bio:** ${user.bio}` : ''}`
        }]
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la récupération du profil: ${error.message}` }],
        isError: true
      };
    }
  }

  async getRepositoryContents(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { owner, repo, path = '', ref = 'main' } = args;

      const response = await this.octokit.repos.getContent({
        owner: owner!,
        repo: repo!,
        path,
        ref
      });

      if (Array.isArray(response.data)) {
        // C'est un dossier
        const files = response.data.map(item => ({
          name: item.name,
          type: item.type,
          size: item.size,
          url: item.html_url,
          download_url: item.download_url
        }));

        return {
          content: [{
            type: 'text',
            text: `📁 **Contenu de ${owner}/${repo}/${path}** (${files.length} éléments):\n\n${files.map(file =>
              `${file.type === 'dir' ? '📁' : '📄'} **${file.name}**\n` +
              `   📏 ${file.size} bytes\n` +
              `   🔗 ${file.url}\n`
            ).join('\n')}`
          }]
        };
      } else {
        // C'est un fichier
        const file = response.data;
        const content = Buffer.from(file.content, 'base64').toString('utf-8');

        return {
          content: [{
            type: 'text',
            text: `📄 **${file.name}** (${file.size} bytes)\n` +
                 `🔗 ${file.html_url}\n\n` +
                 `--- Contenu ---\n${content.substring(0, 2000)}${content.length > 2000 ? '\n... (tronqué)' : ''}`
          }]
        };
      }
    } catch (error) {
      logger.error('Error getting repository contents:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la récupération du contenu: ${error.message}` }],
        isError: true
      };
    }
  }

  async searchCode(args: GitHubToolArgs) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Please provide GITHUB_TOKEN.');
      }

      const { query, language, repo, filename, per_page = 10 } = args;

      let searchQuery = query!;
      if (language) searchQuery += ` language:${language}`;
      if (repo) searchQuery += ` repo:${repo}`;
      if (filename) searchQuery += ` filename:${filename}`;

      const response = await this.octokit.search.code({
        q: searchQuery,
        per_page: Math.min(per_page, 100)
      });

      const results = response.data.items.map(item => ({
        name: item.name,
        path: item.path,
        url: item.html_url,
        repository: item.repository.full_name,
        score: item.score
      }));

      return {
        content: [{
          type: 'text',
          text: `🔍 **Résultats de recherche pour "${query}"** (${response.data.total_count} résultats):\n\n${results.map(result =>
            `📄 **${result.name}**\n` +
            `   📁 ${result.path}\n` +
            `   📦 ${result.repository}\n` +
            `   🎯 Score: ${result.score}\n` +
            `   🔗 ${result.url}\n`
          ).join('\n')}`
        }]
      };
    } catch (error) {
      logger.error('Error searching code:', error);
      return {
        content: [{ type: 'text', text: `Erreur lors de la recherche de code: ${error.message}` }],
        isError: true
      };
    }
  }
}
