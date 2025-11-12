import matplotlib.pyplot as plt
import numpy as np

# Generate realistic data for "modes" and their associated "strength"
# X-axis: Represents different "modes" (e.g., mode identifiers)
# Y-axis: Represents a quantitative characteristic of each mode, such as amplitude, power, or presence.
num_modes = 7
modes = [f'Mode {i+1}' for i in range(num_modes)]
np.random.seed(42) # for reproducibility
# Simulate varying "amplitudes" or "strengths" for each mode
mode_strengths = np.random.rand(num_modes) * 8 + 2 # Values between 2 and 10

# Create the bar plot
plt.figure(figsize=(10, 6))
plt.bar(modes, mode_strengths, color='teal', alpha=0.8)

# Set title and labels
plt.title('Visualization 3')
plt.xlabel('X') # As requested, representing different modes
plt.ylabel('Y') # As requested, representing mode strength/amplitude

# Add the description as a text box below the plot
description = "cs restrict the possible field configurations to specific \"modes.\" These modes describe the spatial distribution of the electric and magnetic fields perpendicular to the direction of propagation."
plt.figtext(0.5, 0.01, description, ha="center", fontsize=9, bbox={"facecolor":"lightgray", "alpha":0.7, "pad":5})

# Adjust layout to make space for the description
plt.tight_layout(rect=[0, 0.07, 1, 1])

# Display the plot
plt.show()