import matplotlib.pyplot as plt
import numpy as np

np.random.seed(42)  # For reproducibility

# Generate data
num_samples = 100

# X-axis: A hypothetical factor representing the effectiveness of radar cross-section (RCS) minimization design.
# This could represent material absorption efficiency, shape optimization index, etc.
# Higher values indicate better design for minimizing RCS.
x_data = np.random.rand(num_samples) * 0.9 + 0.1 # Values ranging from 0.1 to 1.0

# Y-axis: Simulated Radar Cross-Section (RCS) in dBsm (decibels relative to one square meter).
# Lower values of Y represent more effective stealth or RCS reduction.
# We model a general trend where as X (design effectiveness) increases, Y (RCS) decreases.
base_rcs = 25 # High RCS for a non-optimized target
rcs_reduction_per_unit_x = 50 # How much RCS is reduced for a unit increase in X
noise_amplitude = 8 # Random variation around the trend

y_data = base_rcs - (rcs_reduction_per_unit_x * x_data) + np.random.normal(0, noise_amplitude, num_samples)

# Ensure RCS values stay within a somewhat realistic range (e.g., not extremely low or high)
y_data[y_data < -40] = -40 + np.random.rand(np.sum(y_data < -40)) * 5 # Cap at -40 dBsm with slight variation
y_data[y_data > 25] = 25 - np.random.rand(np.sum(y_data > 25)) * 5 # Cap at 25 dBsm with slight variation

# Create plot
fig, ax = plt.subplots(figsize=(10, 7)) # Adjust figure size to accommodate the long description

ax.scatter(x_data, y_data, alpha=0.7, color='dodgerblue', edgecolors='w', s=60)

ax.set_title("Visualization 1", fontsize=16, pad=20)
ax.set_xlabel("X", fontsize=14)
ax.set_ylabel("Y", fontsize=14)

ax.grid(True, linestyle='--', alpha=0.6)

# Set axis limits for better visualization
ax.set_xlim(0, 1.05)
ax.set_ylim(min(y_data) - 5, max(y_data) + 5)

# Add the description using figtext
description_text = "Aircraft and ships use materials and shapes designed to minimize radar cross-section by absorbing or scattering incident radar waves away from the receiver. This involves careful control of reflection."
plt.figtext(0.5, 0.01, description_text, ha="center", wrap=True, fontsize=10,
            bbox={"facecolor":"lightgray", "alpha":0.6, "pad":5},
            color='black')

plt.tight_layout(rect=[0, 0.1, 1, 1]) # Adjust tight_layout to make space for the figtext at the bottom
# Do NOT include
plt.tight_layout()