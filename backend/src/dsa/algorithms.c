#include "algorithms.h"
int cb_linear_search(const int*a,size_t n,int k){if(!a)return -1;for(size_t i=0;i<n;i++)if(a[i]==k)return (int)i;return -1;}
int cb_binary_search_sorted(const int*a,size_t n,int k){if(!a)return -1;size_t l=0,r=n;while(l<r){size_t m=l+(r-l)/2;if(a[m]==k)return (int)m;if(a[m]<k)l=m+1;else r=m;}return -1;}
void cb_bubble_sort(int*a,size_t n){if(!a)return;for(size_t e=n;e>1;e--){int changed=0;for(size_t i=1;i<e;i++)if(a[i-1]>a[i]){int t=a[i];a[i]=a[i-1];a[i-1]=t;changed=1;}if(!changed)break;}}
void cb_selection_sort(int*a,size_t n){if(!a)return;for(size_t i=0;i<n;i++){size_t m=i;for(size_t j=i+1;j<n;j++)if(a[j]<a[m])m=j;int t=a[i];a[i]=a[m];a[m]=t;}}
