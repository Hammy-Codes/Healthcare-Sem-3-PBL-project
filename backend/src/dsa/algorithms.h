#ifndef CB_ALGORITHMS_H
#define CB_ALGORITHMS_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
int cb_linear_search(const int*a,size_t n,int key);
int cb_binary_search_sorted(const int*a,size_t n,int key);
void cb_bubble_sort(int*a,size_t n);
void cb_selection_sort(int*a,size_t n);
#ifdef __cplusplus
}
#endif
#endif
