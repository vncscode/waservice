const axios = require('axios');

async function githubStalk(username, token = null) {
    if (!username) throw new Error('Nome de usuário não fornecido!');

    const headers = token ? { 'Authorization': `token ${token}` } : {};
    const apiUrl = `https://api.github.com/users/${username}`;

    try {
        const userResponse = await axios.get(apiUrl, { headers });
        const userData = userResponse.data;

        if (userResponse.status !== 200) {
            throw new Error(userData.message || 'Usuário não encontrado');
        }

        const reposResponse = await axios.get(userData.repos_url, { headers });
        const reposData = reposResponse.data;

        const userInfo = {
            username: userData.login,
            name: userData.name,
            bio: userData.bio,
            avatar: userData.avatar_url,
            followers: userData.followers,
            following: userData.following,
            publicRepos: userData.public_repos,
            blog: userData.blog,
            location: userData.location,
            joinedAt: userData.created_at,
            githubUrl: userData.html_url,
            repositorios: reposData.map(repo => ({
                id: repo.id,
                nome: repo.name,
                url: repo.html_url,
                descricao: repo.description,
                linguagem: repo.language,
                estrelas: repo.stargazers_count,
                forks: repo.forks_count,
                criadoEm: repo.created_at,
                atualizadoEm: repo.updated_at,
                tamanho: repo.size,
                privado: repo.private,
                fork: repo.fork,
                defaultBranch: repo.default_branch,
                openIssues: repo.open_issues_count
            }))
        };

        return {
            success: true,
            ...userInfo
        };

    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
}

module.exports = githubStalk;