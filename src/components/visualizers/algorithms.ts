// Single source of truth for algorithm metadata (name, category, description,
// pros/cons, real-world applications). The sidebar nav and the main page both
// read from this so they can never drift out of sync.

export interface AlgoApp {
  title: string;
  desc: string;
}

export interface Algorithm {
  id: string;
  name: string;
  category: string; // "Classification" | "Clustering" | "Regression" | "Optimization"
  tagline: string;
  desc: string;
  pro: string;
  con: string;
  apps: AlgoApp[];
}

export const ALGORITHMS: Algorithm[] = [
  {
    id: "dbscan",
    name: "DBSCAN",
    category: "Clustering",
    tagline: "Density reveals structure.",
    desc: "DBSCAN is an unsupervised machine learning model that groups data points using two main hyperparameters: Epsilon and min_samples. Epsilon is the radius around the current data point in which all other data points are considered its neighbors. Min_samples is the number of data points within Epsilon, including the selected point itself, required to consider the selected point as a core point within that epsilon neighborhood. Core points are then connected to form clusters. DBSCAN shines where other models like K-means do not with its affinity for dealing with outliers and non-convex data sets.",
    pro: "Discovers non-linear cluster shapes; auto-detects outliers.",
    con: "Struggles when clusters have very different densities.",
    apps: [
      {
        title: "Finance — Anomaly Trading Detection",
        desc: "Trade volume vs. time clusters ordinary activity and isolates flash-crash spikes as “noise” worth investigating.",
      },
      {
        title: "Healthcare — Outbreak Tracking",
        desc: "GPS coordinates reveal dense disease clusters and ignore isolated cases, mapping an outbreak’s true shape.",
      },
    ],
  },
  {
    id: "knn",
    name: "K-Nearest Neighbors",
    category: "Classification",
    tagline: "You are your neighbors.",
    desc: "K-nearest-neighbors is among the simplest supervised ML algorithms, often referred to as a “lazy learner” algorithm. KNN has one hyperparameter, K, which represents how many of the closest training points the algorithm considers when classifying a given data point. In the animation, if the majority of the 5 closest points are blue, the given point gets classified as blue and vice-versa.",
    pro: "No training; conceptually simple; naturally handles multi-class.",
    con: "Slow at inference on large data; suffers in high dimensions.",
    apps: [
      {
        title: "Finance — Peer Stock Matching",
        desc: "P/E ratio vs. volatility classifies a new stock by finding the 5 most similar historical names and voting on its trajectory.",
      },
      {
        title: "Healthcare — Patient Profiling",
        desc: "BMI vs. glucose predicts diabetes risk by locating the 5 most similar patient profiles in the historical record.",
      },
    ],
  },
  {
    id: "kmeans",
    name: "K-Means Clustering",
    category: "Clustering",
    tagline: "Find K hearts of the data.",
    desc: "K-means is an unsupervised ML model that clusters data points into a predetermined number of categories. It does so by minimizing the squared distance between a cluster of data points and our centroid. The centroids begin in randomized locations to prevent biases and maintain simplicity. The algorithm then iteratively assigns individual data points to a given centroid and moves the centroid into the position with the least squared distance relative to the currently selected points.",
    pro: "Fast and scales to very large datasets.",
    con: "You must choose K; assumes spherical, similarly-sized clusters.",
    apps: [
      {
        title: "Finance — Customer Segmentation",
        desc: "Income vs. spending groups bank customers into 3 tiers for precisely targeted marketing campaigns.",
      },
      {
        title: "Healthcare — Symptom Grouping",
        desc: "Patient survey responses cluster into symptom profiles, surfacing previously-unknown underlying syndromes.",
      },
    ],
  },
  {
    id: "decision-trees",
    name: "Decision Trees",
    category: "Classification",
    tagline: "Split. Branch. Decide.",
    desc: "A decision tree is a simple supervised ML model that splits data points into groupings based on the similarity of their features. A simple, verbal representation of how it works is, “Is this true? If yes, move to the left node. If not, move to the right node”.",
    pro: "Highly interpretable — every prediction traces a human-readable path.",
    con: "Prone to overfitting; small changes in data can reshape the tree.",
    apps: [
      {
        title: "Finance — Credit Scoring",
        desc: "Income vs. debt splits applicants into “Approve” or “Deny” using clear, auditable thresholds that regulators can inspect.",
      },
      {
        title: "Healthcare — Triage Diagnosis",
        desc: "Blood pressure vs. cholesterol routes patients into risk bands via a chain of simple vital-sign questions.",
      },
    ],
  },
  {
    id: "random-forest",
    name: "Random Forest",
    category: "Classification",
    tagline: "Many trees, one verdict.",
    desc: "A random forest is an ensemble of decision trees. Each subtree is trained on a randomly selected subset of the broader dataset. The individual classification results of each subtree are then brought together and the final region predictions are made by taking the “votes” of all the subtrees and using them to categorize the regions. In animation examples, regions that have more votes for red are classified as red, and vice versa.",
    pro: "Highly accurate; tames the variance of a single tree.",
    con: "Less interpretable than one tree; heavier to store and run.",
    apps: [
      {
        title: "Finance — Algorithmic Trading",
        desc: "50 technical indicators feed 100 trees that vote “Buy” or “Sell”, smoothing noise a single tree would overfit.",
      },
      {
        title: "Healthcare — Readmission Prediction",
        desc: "Patient history + labs feed an ensemble that predicts 30-day readmission risk far more reliably than one tree.",
      },
    ],
  },
  {
    id: "naive-bayes",
    name: "Naive Bayes",
    category: "Classification",
    tagline: "Bayes, assuming independence.",
    desc: "Naive Bayes is a supervised ML model that categorizes data points based on their features. It makes the assumption that features are independent of one another. In the most famous example of Naive Bayes, the email spam filter problem, this is highlighted simply: If we are checking for 3 words, prize, winner, and money, the algorithm assumes that the probability of the email containing the word prize is totally independent of the probability of it containing the word winner. The algorithm uses Bayes’ theorem to find the probability of a class given the features.",
    pro: "Extremely fast; thrives on small data and high dimensions.",
    con: "The independence assumption is almost never true in reality.",
    apps: [
      {
        title: "Finance — Fraud Detection",
        desc: "Transaction amount vs. location: fraud probability is computed per feature and combined, flagging anomalous activity in milliseconds.",
      },
      {
        title: "Healthcare — Disease Risk",
        desc: "Age vs. smoking status multiply independent likelihoods to estimate heart-disease risk from a handful of signals.",
      },
    ],
  },
  {
    id: "linear-regression",
    name: "Linear Regression",
    category: "Regression",
    tagline: "The straight line that fits.",
    desc: "Linear regression is a simple model that essentially finds the line of best fit for a set of data points by minimizing the squared distances between all data points and the our line. The most common equation used for this model is the slope intercept equation, y = mx + b. Where m is the slope of the line of best fit and b is our bias that can be adjusted up or down depending on where the cluster sits on the plane.",
    pro: "Transparent; fast; the coefficients have clear meaning.",
    con: "Only models linear relationships; sensitive to outliers.",
    apps: [
      {
        title: "Finance — Beta from Market Returns",
        desc: "S&P 500 vs. stock returns: the fitted slope is the stock’s “Beta”, the risk it shares with the market.",
      },
      {
        title: "Healthcare — Blood Pressure vs. Weight",
        desc: "BMI vs. systolic pressure predicts a patient’s blood pressure from a single, easy-to-measure variable.",
      },
    ],
  },
  {
    id: "nonlinear-regression",
    name: "Nonlinear Regression",
    category: "Regression",
    tagline: "Curves that capture reality.",
    desc: "Nonlinear regression is essentially the same thing as linear regression, only we are not fitting a line to data, but instead a curve. Nonlinear regression is superior to linear regression in datasets with oddly shaped data trends, but is far more prone to overfitting due to its ability to be very granular when tracking the data points.",
    pro: "Captures the complex patterns real data actually has.",
    con: "Easier to overfit; harder to interpret than a line.",
    apps: [
      {
        title: "Finance — Options Volatility Smile",
        desc: "Strike price vs. option value: models the convex “smile” of implied volatility that a line could never represent.",
      },
      {
        title: "Healthcare — Drug Dose–Response",
        desc: "Dosage vs. efficacy models the S-curve of drug effectiveness saturating beyond a therapeutic dose.",
      },
    ],
  },
  {
    id: "gradient-descent",
    name: "Gradient Descent",
    category: "Optimization",
    tagline: "Roll downhill to the minimum.",
    desc: "In predictive machine learning, the key indicator of how accurate our predictions are is the cost function. The larger the output of our cost function, the further we are from predicting the correct value. The purpose of Gradient Descent is to minimize the cost function using the gradient. In this example, we see the algorithm tracking down the parabola with a very small step size to the bottom of the curve, which is the minimum. In real world applications, the step size can be increased to reduce runtime, or decreased to find a more minimized value. Too large of a step-size, however, can lead to the algorithm overshooting the minimized value and diverging. To get the best of both worlds, we can make a step size function that starts larger and decays as we get closer to the minimum as seen in the animation above.",
    pro: "Scales to models with billions of parameters.",
    con: "Can get stuck in local minima; needs a tuned learning rate.",
    apps: [
      {
        title: "Finance — Portfolio Risk Minimization",
        desc: "Asset weights are nudged iteratively toward the minimum-variance portfolio that maximizes risk-adjusted return.",
      },
      {
        title: "Healthcare — Medical Image Segmentation",
        desc: "Neural-network weights descend the loss to segment tumors from scans, learning pixel-by-pixel boundaries.",
      },
    ],
  },
];
