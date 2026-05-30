param(
    [string]$RepoUrl = "",
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Err($msg) { Write-Host "[error] $msg" -ForegroundColor Red }

try {
    git --version > $null 2>&1
} catch {
    Write-Err "git is not installed or not in PATH. Install git first."; exit 1
}

# Initialize repo if needed
$isGit = $true
git rev-parse --is-inside-work-tree > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Info "Initializing new git repository..."
    git init
    git checkout -b $Branch
    $isGit = $false
} else {
    Write-Info "Repository detected. Ensuring branch $Branch exists..."
    git checkout $Branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        git checkout -b $Branch
    }
}

Write-Info "Staging files..."
git add .

if ((git status --porcelain) -ne "") {
    git commit -m "chore: initial commit" 2>$null
} else {
    Write-Info "No changes to commit."
}

if ($RepoUrl) {
    Write-Info "Adding remote $Remote -> $RepoUrl"
    git remote remove $Remote 2>$null
    git remote add $Remote $RepoUrl
    Write-Info "Pushing to $RepoUrl (branch: $Branch)"
    git push -u $Remote $Branch
} else {
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-Info "Creating repository on GitHub using 'gh' and pushing..."
        gh repo create --public --source . --remote $Remote --push
    } else {
        Write-Err "No RepoUrl provided and GitHub CLI 'gh' not found.\nEither install 'gh' and authenticate (gh auth login) or provide the RepoUrl parameter."
        exit 2
    }
}

Write-Info "Done. Verify repository on GitHub and adjust branch/protection rules as needed."
