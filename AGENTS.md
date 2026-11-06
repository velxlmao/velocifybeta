# Velocify v2 beta workspace

All new development belongs in this repository, velxlmao/velocifybeta.
Do not modify or push velocify-static, goonwize, monkey, or the original velocify source repository.
This repository starts as a copy of the published Velocify v1 site. Preserve its behavior until the user requests v2 changes.
The deployable website files live at the repository root. Edit and publish here instead of running the original repository's static build.
Publish changes to this repository only. main is the primary branch, and v1 is a compatibility alias in this beta repository only.
Existing remote backend services are shared with the original site. Do not redeploy or alter shared workers during beta development. Create independent beta services before changing backend behavior.
Never put API keys, owner passwords, or deployment credentials in this repository or its client files.
