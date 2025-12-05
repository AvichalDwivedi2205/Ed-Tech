#!/bin/bash

# Delete duplicate spec folders from .kiro/specs
cd /home/avich/openT/sex/specs

for folder in employee-file-access-fix environment-configuration-guide existing-user-email-verification file-management-dashboard file-manager-delete-modal-fix file-manager-pagination-configuration file-manager-template-consolidation google-drive-copy-feedback-enhancement google-drive-error-handling-enhancement google-drive-status-messaging-improvement google-drive-token-auto-renewal-system google-drive-user-based-config initial-setup-wizard installation-improvement-workflow pending-upload-recovery-system primary-contact-management-enhancement queue-status-display-cleanup queue-worker-status-fix role-based-email-verification-templates session-driver-compatibility-fix setup-instructions-status-enhancement setup-simplification upload-success-modal-overlay-fix user-management-page-refinement; do
    if [ -d "$folder" ]; then
        rm -rf "$folder"
        echo "Deleted: $folder"
    fi
done

# Delete duplicate steering files from .kiro/steering
cd /home/avich/openT/.kiro/steering

for file in ddev-context.md development-workflow.md frontend-guidelines.md google-drive-integration.md installed-packages.md laravel-conventions.md migration-best-practices.md modal-development-standards.md tool-usage-patterns.md; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "Deleted: $file"
    fi
done

echo "Done deleting duplicates!"

