import matplotlib.pyplot as plt
import numpy as np

# Set a random seed for reproducibility
np.random.seed(42)

# Generate realistic data that reflects concepts of electromagnetic waves,
# stealth technology, and optical coatings.
# Let X represent a generalized parameter of electromagnetic waves (e.g., frequency, wavelength index).
# Let Y represent a measure of reflection or radar cross-section (lower values indicate better performance
# for stealth or optical coatings).

# 1. Background/General materials: Moderate to high reflection across the spectrum
num_general_points = 150
x_general = np.random.rand(num_general_points) * 100
y_general = 0.6 + 0.3 * np.random.rand(num_general_points) + 0.1 * np.sin(x_general / 10)
y_general = np.clip(y_general, 0.5, 0.95) # Keep values within a reasonable range

# 2. Stealth Technology effect: Significant reduction in reflection in a specific 'radar' band
num_stealth_points = 70
x_stealth_band = 20 + np.random.rand(num_stealth_points) * 30 # X-range from 20 to 50
y_stealth_performance = 0.05 + 0.15 * np.random.rand(num_stealth_points) # Low reflection
y_stealth_performance[x_stealth_band < 35] += 0.05 # Slight variation

# 3. Optical Coatings effect: Significant reduction in reflection in another specific 'optical' band
num_optical_points = 70
x_optical_band = 60 + np.random.rand(num_optical_points) * 30 # X-range from 60 to 90
y_optical_performance = 0.02 + 0.1 * np.random.rand(num_optical_points) # Very low reflection
y_optical_performance[x_optical_band > 75] += 0.03 # Slight variation

# Combine all data points
x_data = np.concatenate([x_general, x_stealth_band, x_optical_band])
y_data = np.concatenate([y_general, y_stealth_performance, y_optical_performance])

# Create the scatter plot
plt.figure(figsize=(10, 6))
plt.scatter(x_data, y_data, alpha=0.7, s=50) # 's' for size, 'alpha' for transparency

# Set plot title and labels as required
plt.title('Visualization 1')
plt.xlabel('X')
plt.ylabel('Y')

# Add a grid for better readability
plt.grid(True, linestyle='--', alpha=0.6)

# Display the plot
plt.tight_layout()
plt.show()