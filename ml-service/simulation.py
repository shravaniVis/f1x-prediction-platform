import numpy as np

drivers = ["VER", "LEC", "NOR"]
probabilities = [0.6, 0.25, 0.15]

results = np.random.choice(drivers, size=10000, p=probabilities)

unique, counts = np.unique(results, return_counts=True)

for d, c in zip(unique, counts):
    print(d, c / 10000)